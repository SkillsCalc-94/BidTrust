import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import authenticate from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Barcode product lookup (UPC Item DB — free tier) ─────────────────────────
async function lookupBarcode(code) {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    return {
      title: item.title,
      brand: item.brand,
      category: item.category,
      description: item.description,
      images: item.images?.slice(0, 2) || [],
      lowest_price: item.lowest_recorded_price,
      highest_price: item.highest_recorded_price,
    };
  } catch {
    return null;
  }
}

// ── AI competitor price research via Claude ──────────────────────────────────
async function fetchCompetitorPrices(productName, category, imageUrl) {
  const imageBlock = imageUrl
    ? [{ type: 'image', source: { type: 'url', url: imageUrl } }]
    : [];

  const prompt = `You are a South African secondhand marketplace price research specialist.

Product: ${productName}
Category: ${category || 'Unknown'}

Research the current South African secondhand and retail market for this exact product and provide:
1. Current prices on SA secondhand platforms (OLX SA, Gumtree SA, Facebook Marketplace SA, Bid or Buy)
2. Current new retail prices in SA (Takealot, Incredible Connection, Game, Hi-Fi Corp, etc.)
3. Typical condition-based price breakdown

Respond ONLY with this exact JSON (no markdown, no extra text):
{
  "product_name": "<corrected/full product name>",
  "brand": "<brand if identifiable>",
  "category": "<most accurate category>",
  "retail_price_new": <number in ZAR or null>,
  "secondhand_prices": {
    "excellent": <number in ZAR>,
    "good": <number in ZAR>,
    "fair": <number in ZAR>,
    "poor": <number in ZAR>
  },
  "competitor_listings": [
    {"platform": "<OLX SA|Gumtree SA|Facebook Marketplace|Bid or Buy>", "price_low": <number>, "price_high": <number>, "typical_condition": "<condition>"},
    {"platform": "<Takealot|Incredible Connection|Game>", "price_low": <number>, "price_high": <number>, "typical_condition": "new"}
  ],
  "market_trend": "<rising|stable|falling>",
  "demand_level": "<high|medium|low>",
  "best_sell_price": <number — optimal listing price for quick sale in ZAR>,
  "price_insight": "<2 sentences about this product's SA market>"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: 'You are a South African marketplace pricing expert with deep knowledge of OLX SA, Gumtree SA, Takealot, and all major SA retail/secondhand platforms. Always respond with valid JSON only — no markdown code fences.',
    messages: [{
      role: 'user',
      content: [...imageBlock, { type: 'text', text: prompt }],
    }],
  });

  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(jsonMatch ? jsonMatch[1].trim() : text);
}

// ── AI vision: identify any item from photo ──────────────────────────────────
async function identifyFromPhoto(imageUrl) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: 'You are an expert item identification AI for the South African secondhand market. Identify products from photos with high accuracy. Always respond with valid JSON only.',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        {
          type: 'text',
          text: `Identify this item in detail. Respond ONLY with this exact JSON:
{
  "product_name": "<full descriptive product name, e.g. 'Samsung Galaxy S21 5G Smartphone'>",
  "brand": "<brand or manufacturer>",
  "model": "<model number/name if visible>",
  "category": "<Electronics|Furniture|Clothing|Vehicles|Collectibles|Sports|Books|Appliances|Tools|Toys|Other>",
  "condition_estimate": "<new|like_new|good|fair|poor — from photo>",
  "identifying_features": "<brief: colour, size, key features visible>",
  "confidence": "<high|medium|low>"
}`,
        },
      ],
    }],
  });

  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(jsonMatch ? jsonMatch[1].trim() : text);
}

// ── POST /api/scan/identify — upload photo, identify item + get competitor prices
router.post('/identify', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });

    const imageUrl = req.file.path; // Cloudinary URL

    // Run identification and competitor research in parallel
    let identification;
    try {
      identification = await identifyFromPhoto(imageUrl);
    } catch (err) {
      console.error('Vision identify error:', err);
      return res.status(500).json({ error: 'Could not identify item from photo' });
    }

    let competitorPrices;
    try {
      competitorPrices = await fetchCompetitorPrices(
        identification.product_name,
        identification.category,
        imageUrl,
      );
    } catch (err) {
      console.warn('Competitor price fetch failed:', err.message);
      competitorPrices = null;
    }

    res.json({
      identification,
      competitor_prices: competitorPrices,
      image_url: imageUrl,
    });
  } catch (err) {
    console.error('Scan identify error:', err);
    res.status(500).json({ error: 'Scan failed' });
  }
});

// ── POST /api/scan/barcode — look up barcode + get competitor prices ──────────
router.post('/barcode', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { barcode_data, barcode_type } = req.body;
    if (!barcode_data) return res.status(400).json({ error: 'barcode_data required' });

    const imageUrl = req.file?.path || null;

    // 1. Try barcode database lookup (free)
    const barcodeProduct = await lookupBarcode(barcode_data);

    // 2. Get competitor prices — use barcode DB name if found, otherwise AI identifies from image
    let productName = barcodeProduct?.title;
    let category = barcodeProduct?.category;

    let identification = null;
    if (!productName && imageUrl) {
      try {
        identification = await identifyFromPhoto(imageUrl);
        productName = identification.product_name;
        category = identification.category;
      } catch {
        productName = `Product ${barcode_data}`;
      }
    }

    let competitorPrices = null;
    if (productName) {
      try {
        competitorPrices = await fetchCompetitorPrices(productName, category, imageUrl);
      } catch (err) {
        console.warn('Competitor price fetch failed:', err.message);
      }
    }

    res.json({
      barcode: { data: barcode_data, type: barcode_type },
      barcode_product: barcodeProduct,
      identification: identification || (barcodeProduct ? {
        product_name: barcodeProduct.title,
        brand: barcodeProduct.brand,
        category: barcodeProduct.category,
        condition_estimate: 'unknown',
        confidence: 'high',
      } : null),
      competitor_prices: competitorPrices,
      image_url: imageUrl,
    });
  } catch (err) {
    console.error('Scan barcode error:', err);
    res.status(500).json({ error: 'Barcode scan failed' });
  }
});

// ── POST /api/scan/demo — public, no auth, rate-limited to 10 req/IP/hour ────
// Used by the landing page "Try AI Scan" demo — no account needed.
const demoRateMap = new Map(); // ip -> { count, resetAt }

function demoRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = demoRateMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 10) {
      return res.status(429).json({ error: 'Demo limit reached. Sign up for unlimited AI scans!' });
    }
    entry.count++;
  } else {
    demoRateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
  }
  next();
}

router.post('/demo', demoRateLimit, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });
    const imageUrl = req.file.path;
    const { barcode_data, barcode_type } = req.body;

    let identification = null;
    let competitorPrices = null;

    if (barcode_data) {
      const barcodeProduct = await lookupBarcode(barcode_data);
      if (barcodeProduct) {
        identification = {
          product_name: barcodeProduct.title,
          brand: barcodeProduct.brand,
          category: barcodeProduct.category || 'Other',
          condition_estimate: 'good',
          confidence: 'high',
          identifying_features: barcodeProduct.description?.slice(0, 120) || '',
        };
      }
    }

    if (!identification) {
      identification = await identifyFromPhoto(imageUrl);
    }

    competitorPrices = await fetchCompetitorPrices(
      identification.product_name,
      identification.category,
      imageUrl,
    ).catch(() => null);

    res.json({ identification, competitor_prices: competitorPrices, image_url: imageUrl });
  } catch (err) {
    console.error('Demo scan error:', err);
    res.status(500).json({ error: 'Scan failed' });
  }
});

export default router;
