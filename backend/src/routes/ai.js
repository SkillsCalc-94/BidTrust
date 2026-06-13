import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import authenticate from '../middleware/auth.js';
import { upload, uploadSingle } from '../config/cloudinary.js';

const router = Router();
let _anthropic = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

// POST /api/ai/estimate — 4-phase AI valuation with images
router.post('/estimate', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const {
      item_name,
      condition,
      age_years,
      original_price,
      category,
      description,
      // 3 qualifying questions
      q1_defects,       // Any defects or repairs needed?
      q2_accessories,   // Original packaging / accessories included?
      q3_reason,        // Reason for selling?
    } = req.body;

    if (!item_name || !condition || !category) {
      return res.status(400).json({ error: 'item_name, condition, and category are required' });
    }

    const imageBlocks = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        imageBlocks.push({
          type: 'image',
          source: { type: 'url', url: file.path },
        });
      }
    }

    const spendNote = original_price
      ? `The seller originally paid R${original_price} for this item.`
      : 'Original purchase price not provided.';

    const qualifyingAnswers = [
      q1_defects ? `Defects/repairs: ${q1_defects}` : null,
      q2_accessories ? `Packaging/accessories: ${q2_accessories}` : null,
      q3_reason ? `Reason for selling: ${q3_reason}` : null,
    ].filter(Boolean).join('\n');

    const userPrompt = `Item: ${item_name}
Category: ${category}
Condition: ${condition}
Age: ${age_years || 'Unknown'} years
${spendNote}
Description: ${description || 'Not provided'}
${qualifyingAnswers ? `\nSeller Answers:\n${qualifyingAnswers}` : ''}

Analyze the photos and all provided information to produce a 4-phase South African market valuation in ZAR (Rand).

Respond ONLY with this exact JSON structure (no markdown, no extra text):
{
  "spend_price": <number or null — seller's original purchase price in ZAR, use provided value or estimate from market data>,
  "buyers_value": {
    "low": <number>,
    "mid": <number>,
    "high": <number>,
    "insight": "<1 sentence: what buyers typically pay for this item in SA market>"
  },
  "current_value": {
    "low": <number>,
    "mid": <number>,
    "high": <number>,
    "insight": "<1 sentence: current value factoring in condition, age, photos, and qualifying answers>"
  },
  "sell_price_range": {
    "low": <number — conservative realistic sell price>,
    "high": <number — optimistic realistic sell price>,
    "sweet_spot": <number — best price to list at for quick sale>
  },
  "confidence": "<low|medium|high>",
  "depreciation_pct": <number 0-100 — estimated % value lost from original price>,
  "condition_assessment": "<brief photo-based condition note>",
  "reasoning": "<2-3 sentences explaining the valuation>",
  "market_trend": "<rising|stable|falling>",
  "suggested_starting_price": <number>,
  "suggested_buy_now_price": <number>,
  "comparable_items": [
    {"name": "<item name>", "price": <number>, "source": "<e.g. OLX SA, Gumtree SA>"}
  ]
}`;

    const content = [
      ...imageBlocks,
      { type: 'text', text: userPrompt },
    ];

    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: 'You are an expert secondhand marketplace appraiser specialising in the South African market. You analyse item photos and seller details to produce accurate, data-driven valuations in ZAR (South African Rand). You know SA platforms like OLX, Gumtree, Facebook Marketplace, and Bid or Buy. Always respond with valid JSON only — no markdown code fences.',
      messages: [{ role: 'user', content }],
    });

    const responseText = message.content[0].text.trim();

    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    let estimate;
    try {
      estimate = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', responseText);
      return res.status(500).json({ error: 'AI returned invalid response format' });
    }

    res.json({ estimate, images_analyzed: req.files?.length || 0 });
  } catch (err) {
    console.error('AI estimate error:', err);
    res.status(500).json({ error: 'Failed to generate AI estimate' });
  }
});

// POST /api/ai/describe — Auto-generate title + description from a single photo
router.post('/describe', authenticate, uploadSingle.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'An image is required' });
    }

    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'You are an expert marketplace listing writer for the South African secondhand market. Analyse item photos and generate compelling, accurate listing titles and descriptions. Always respond with valid JSON only.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: req.file.path },
            },
            {
              type: 'text',
              text: 'Look at this item photo and generate a marketplace listing for it. Respond ONLY with this JSON structure:\n{"title": "string (concise, 5-10 words)", "description": "string (2-3 sentences describing the item, its features, and appeal)", "suggested_category": "Electronics|Furniture|Clothing|Vehicles|Collectibles|Sports|Books|Other", "condition_hints": "string (what the photo suggests about item condition)"}',
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].text.trim();

    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('Failed to parse AI describe response:', responseText);
      return res.status(500).json({ error: 'AI returned invalid response format' });
    }

    res.json({ ...result, image_url: req.file.path });
  } catch (err) {
    console.error('AI describe error:', err);
    res.status(500).json({ error: 'Failed to generate item description' });
  }
});

export default router;
