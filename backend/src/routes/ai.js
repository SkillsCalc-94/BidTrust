import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import authenticate from '../middleware/auth.js';
import { upload, uploadSingle } from '../config/cloudinary.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/ai/estimate — AI valuation with images
router.post('/estimate', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const {
      item_name,
      condition,
      age_years,
      original_price,
      category,
      description,
    } = req.body;

    if (!item_name || !condition || !category) {
      return res.status(400).json({ error: 'item_name, condition, and category are required' });
    }

    // Build image content blocks from uploaded files
    const imageBlocks = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        imageBlocks.push({
          type: 'image',
          source: {
            type: 'url',
            url: file.path, // Cloudinary URL
          },
        });
      }
    }

    const userPrompt = `Item: ${item_name}
Condition: ${condition}
Age: ${age_years || 'Unknown'} years
Category: ${category}
Original price: ${original_price ? `$${original_price}` : 'Unknown'}
Description: ${description || 'Not provided'}

Please analyze these photos and provide a market value estimate. Respond ONLY with this JSON structure:
{"estimated_market_value_low": number, "estimated_market_value_mid": number, "estimated_market_value_high": number, "confidence": "low|medium|high", "reasoning": "string", "suggested_starting_price": number, "suggested_buy_now_price": number, "condition_assessment": "string", "comparable_items": [{"name": "string", "price": number}]}`;

    const content = [
      ...imageBlocks,
      {
        type: 'text',
        text: userPrompt,
      },
    ];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are an expert appraiser for a peer-to-peer marketplace. Analyze the provided item photos and details to give accurate, fair market value estimates. Always respond with valid JSON only.',
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    const responseText = message.content[0].text.trim();

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    let estimate;
    try {
      estimate = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', responseText);
      return res.status(500).json({ error: 'AI returned invalid response format' });
    }

    res.json({
      estimate,
      images_analyzed: req.files?.length || 0,
    });
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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'You are an expert marketplace listing writer. Analyze item photos and generate compelling, accurate listing titles and descriptions. Always respond with valid JSON only.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: req.file.path,
              },
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
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('Failed to parse AI describe response:', responseText);
      return res.status(500).json({ error: 'AI returned invalid response format' });
    }

    res.json({
      ...result,
      image_url: req.file.path,
    });
  } catch (err) {
    console.error('AI describe error:', err);
    res.status(500).json({ error: 'Failed to generate item description' });
  }
});

export default router;
