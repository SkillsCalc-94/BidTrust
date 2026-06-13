import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import authenticate from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();
let _anthropic = null;
function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY environment variable is not set on this server');
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

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

// ── AI vision: identify item, return category + item_type ────────────────────
async function identifyFromPhoto(imageUrl) {
  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
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
  "brand": "<brand or manufacturer, or empty string if unknown>",
  "model": "<model number/name if visible, or empty string>",
  "category": "<Electronics|Furniture|Clothing|Vehicles|Collectibles|Sports|Books|Appliances|Tools|Toys|Other>",
  "item_type": "<electronics|luxury|vehicle|furniture|clothing|other>",
  "condition_estimate": "<new|like_new|good|fair|poor>",
  "identifying_features": "<brief: colour, size, key visible features>",
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

// ── AI competitor price research — category-aware, accepts qualifying answers ─
async function fetchCompetitorPrices(productName, category, itemType, imageUrl, answers = {}) {
  const imageBlock = imageUrl
    ? [{ type: 'image', source: { type: 'url', url: imageUrl } }]
    : [];

  // Category-aware platform guidance
  const platformHint = (itemType === 'electronics' || itemType === 'appliances')
    ? 'Focus on: Takealot, Incredible Connection, Game, Hi-Fi Corp (new retail) and OLX SA, Gumtree SA, Bid or Buy (secondhand).'
    : (itemType === 'luxury' || itemType === 'collectibles')
    ? 'Focus on: Bid or Buy, luxury resellers, BidorBuy.co.za (secondhand) and brand boutiques, international references for new retail.'
    : (itemType === 'vehicle')
    ? 'Focus on: AutoTrader SA, Cars.co.za, Gumtree SA motors for secondhand. Ignore retail pricing — vehicles are always secondhand.'
    : 'Focus on: OLX SA, Gumtree SA, Facebook Marketplace SA for secondhand. Retail comparison only if applicable.';

  // Qualifying answers context
  const answersBlock = [
    answers.original_price ? `Original purchase price paid by seller: R${answers.original_price}` : null,
    answers.q1_defects ? `Defects / repairs needed: ${answers.q1_defects}` : null,
    answers.q2_accessories ? `Accessories / packaging included: ${answers.q2_accessories}` : null,
    answers.q3_reason ? `Reason for selling: ${answers.q3_reason}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are a South African secondhand marketplace price research specialist.

Product: ${productName}
Category: ${category || 'Unknown'}
${answersBlock ? `\nSeller Information:\n${answersBlock}` : ''}

${platformHint}

Research the current South African market for this exact product and provide accurate, realistic pricing in ZAR.

Respond ONLY with this exact JSON (no markdown, no extra text):
{
  "product_name": "<corrected/full product name>",
  "brand": "<brand if identifiable>",
  "category": "<most accurate category>",
  "retail_price_new": <number in ZAR or null if not sold new>,
  "secondhand_prices": {
    "excellent": <number in ZAR>,
    "good": <number in ZAR>,
    "fair": <number in ZAR>,
    "poor": <number in ZAR>
  },
  "competitor_listings": [
    {"platform": "<platform name>", "price_low": <number>, "price_high": <number>, "typical_condition": "<condition>"}
  ],
  "market_trend": "<rising|stable|falling>",
  "demand_level": "<high|medium|low>",
  "best_sell_price": <number — optimal listing price for quick sale in ZAR>,
  "price_insight": "<2 sentences about this product's SA market, factoring in any seller-provided details>"
}`;

  const message = await getAnthropic().messages.create({
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

// ── POST /api/scan/identify (authenticated) ───────────────────────────────────
router.post('/identify', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });
    const imageUrl = req.file.path;
    const { q1_defects, q2_accessories, q3_reason, original_price } = req.body;

    const identification = await identifyFromPhoto(imageUrl).catch(err => {
      console.error('Vision identify error:', err);
      return null;
    });
    if (!identification) return res.status(500).json({ error: 'Could not identify item from photo' });

    const competitorPrices = await fetchCompetitorPrices(
      identification.product_name,
      identification.category,
      identification.item_type,
      imageUrl,
      { q1_defects, q2_accessories, q3_reason, original_price },
    ).catch(err => { console.warn('Competitor price fetch failed:', err.message); return null; });

    res.json({ identification, competitor_prices: competitorPrices, image_url: imageUrl });
  } catch (err) {
    console.error('Scan identify error:', err);
    res.status(500).json({ error: 'Scan failed' });
  }
});

// ── POST /api/scan/barcode (authenticated) ────────────────────────────────────
router.post('/barcode', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { barcode_data, barcode_type, q1_defects, q2_accessories, q3_reason, original_price } = req.body;
    if (!barcode_data) return res.status(400).json({ error: 'barcode_data required' });
    const imageUrl = req.file?.path || null;

    const barcodeProduct = await lookupBarcode(barcode_data);
    let productName = barcodeProduct?.title;
    let category = barcodeProduct?.category;
    let itemType = 'other';

    let identification = null;
    if (!productName && imageUrl) {
      identification = await identifyFromPhoto(imageUrl).catch(() => null);
      productName = identification?.product_name;
      category = identification?.category;
      itemType = identification?.item_type || 'other';
    } else if (barcodeProduct) {
      identification = {
        product_name: barcodeProduct.title,
        brand: barcodeProduct.brand,
        category: barcodeProduct.category,
        item_type: 'electronics',
        condition_estimate: 'unknown',
        confidence: 'high',
      };
      itemType = 'electronics';
    }

    const competitorPrices = productName
      ? await fetchCompetitorPrices(productName, category, itemType, imageUrl, { q1_defects, q2_accessories, q3_reason, original_price }).catch(() => null)
      : null;

    res.json({
      barcode: { data: barcode_data, type: barcode_type },
      barcode_product: barcodeProduct,
      identification,
      competitor_prices: competitorPrices,
      image_url: imageUrl,
    });
  } catch (err) {
    console.error('Scan barcode error:', err);
    res.status(500).json({ error: 'Barcode scan failed' });
  }
});

// ── Rate limiter for public demo endpoints ────────────────────────────────────
const demoRateMap = new Map();
function demoRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = demoRateMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 15) {
      return res.status(429).json({ error: 'Demo limit reached. Sign up for unlimited AI scans!' });
    }
    entry.count++;
  } else {
    demoRateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
  }
  next();
}

// ── POST /api/scan/demo — Step 1: identify item only (fast, ~1-2s) ────────────
// Public, no auth. Returns identification + image_url. No pricing yet.
router.post('/demo', demoRateLimit, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });
    const imageUrl = req.file.path;
    const { barcode_data } = req.body;

    let identification = null;

    if (barcode_data) {
      const barcodeProduct = await lookupBarcode(barcode_data);
      if (barcodeProduct) {
        identification = {
          product_name: barcodeProduct.title,
          brand: barcodeProduct.brand,
          category: barcodeProduct.category || 'Other',
          item_type: 'electronics',
          condition_estimate: 'good',
          confidence: 'high',
          identifying_features: barcodeProduct.description?.slice(0, 120) || '',
        };
      }
    }

    if (!identification) {
      identification = await identifyFromPhoto(imageUrl);
    }

    res.json({ identification, image_url: imageUrl });
  } catch (err) {
    console.error('Demo scan error:', err);
    res.status(500).json({ error: 'Scan failed' });
  }
});

// ── POST /api/scan/demo/price — Step 2: full pricing with qualifying answers ──
// Public, no auth. Accepts product info + answers → returns competitor prices.
router.post('/demo/price', demoRateLimit, async (req, res) => {
  try {
    const {
      product_name, category, item_type, image_url,
      original_price, q1_defects, q2_accessories, q3_reason,
    } = req.body;

    if (!product_name) return res.status(400).json({ error: 'product_name required' });

    const competitorPrices = await fetchCompetitorPrices(
      product_name,
      category || 'Other',
      item_type || 'other',
      image_url || null,
      { original_price, q1_defects, q2_accessories, q3_reason },
    );

    res.json({ competitor_prices: competitorPrices });
  } catch (err) {
    console.error('Demo price error:', err);
    res.status(500).json({ error: 'Price research failed' });
  }
});

// ── GET /api/scan/status — check env vars are set (no auth) ──────────────────
router.get('/status', (req, res) => {
  res.json({
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    cloudinary_set: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    supabase_set: !!process.env.SUPABASE_URL,
  });
});

export default router;
