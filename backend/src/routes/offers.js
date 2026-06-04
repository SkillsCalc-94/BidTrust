import { Router } from 'express';
import supabase from '../config/supabase.js';
import authenticate from '../middleware/auth.js';

const router = Router();

// GET /api/offers/listing/:listingId — seller sees all offers
router.get('/listing/:listingId', authenticate, async (req, res) => {
  try {
    const { listingId } = req.params;

    // Verify the requester is the seller
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the seller can view offers' });
    }

    const { data: offers, error } = await supabase
      .from('offers')
      .select(`
        *,
        buyer:profiles!offers_buyer_id_fkey(id, full_name, avatar_url, rating)
      `)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ offers });
  } catch (err) {
    console.error('Get offers error:', err);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// POST /api/offers/listing/:listingId — make an offer
router.post('/listing/:listingId', authenticate, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { amount, message } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Valid offer amount is required' });
    }

    const offerAmount = parseFloat(amount);

    // Check listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, status, buy_now_price')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not active' });
    }

    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ error: 'Sellers cannot make offers on their own listings' });
    }

    // Check for existing pending offer from this buyer
    const { data: existingOffer } = await supabase
      .from('offers')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (existingOffer) {
      return res.status(400).json({ error: 'You already have a pending offer on this listing' });
    }

    const { data: offer, error } = await supabase
      .from('offers')
      .insert({
        listing_id: listingId,
        buyer_id: req.user.id,
        amount: offerAmount,
        message: message || null,
        status: 'pending',
      })
      .select(`
        *,
        buyer:profiles!offers_buyer_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ offer });
  } catch (err) {
    console.error('Make offer error:', err);
    res.status(500).json({ error: 'Failed to submit offer' });
  }
});

// PUT /api/offers/:id/accept — seller accepts offer
router.put('/:id/accept', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*, listing:listings!offers_listing_id_fkey(seller_id, status)')
      .eq('id', id)
      .single();

    if (offerError || !offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the seller can accept offers' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer is no longer pending' });
    }

    if (offer.listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is no longer active' });
    }

    // Accept this offer
    const { data: accepted, error: acceptError } = await supabase
      .from('offers')
      .update({ status: 'accepted' })
      .eq('id', id)
      .select()
      .single();

    if (acceptError) {
      return res.status(500).json({ error: acceptError.message });
    }

    // Decline all other pending offers on this listing
    await supabase
      .from('offers')
      .update({ status: 'declined' })
      .eq('listing_id', offer.listing_id)
      .eq('status', 'pending')
      .neq('id', id);

    res.json({ offer: accepted, message: 'Offer accepted' });
  } catch (err) {
    console.error('Accept offer error:', err);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// PUT /api/offers/:id/decline — seller declines offer
router.put('/:id/decline', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*, listing:listings!offers_listing_id_fkey(seller_id)')
      .eq('id', id)
      .single();

    if (offerError || !offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the seller can decline offers' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer is no longer pending' });
    }

    const { data: declined, error } = await supabase
      .from('offers')
      .update({ status: 'declined' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ offer: declined, message: 'Offer declined' });
  } catch (err) {
    console.error('Decline offer error:', err);
    res.status(500).json({ error: 'Failed to decline offer' });
  }
});

export default router;
