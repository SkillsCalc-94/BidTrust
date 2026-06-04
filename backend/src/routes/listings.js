import { Router } from 'express';
import supabase from '../config/supabase.js';
import authenticate from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// GET /api/listings
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;

    let query = supabase
      .from('listings')
      .select(`
        *,
        seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url, rating, seller_verified),
        listing_photos(id, url, is_primary, sort_order),
        bids(count)
      `)
      .eq('status', 'active');

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    switch (sort) {
      case 'price_asc':
        query = query.order('current_price', { ascending: true, nullsFirst: false });
        break;
      case 'price_desc':
        query = query.order('current_price', { ascending: false });
        break;
      case 'ending_soon':
        query = query.order('auction_end_time', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data: listings, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ listings });
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url, rating, seller_verified, created_at),
        listing_photos(id, url, public_id, is_primary, sort_order),
        bids(id, amount, created_at, bidder:profiles!bids_bidder_id_fkey(id, full_name))
      `)
      .eq('id', id)
      .single();

    if (error || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Increment view count
    await supabase
      .from('listings')
      .update({ view_count: (listing.view_count || 0) + 1 })
      .eq('id', id);

    // Sort bids by amount desc
    if (listing.bids) {
      listing.bids.sort((a, b) => b.amount - a.amount);
    }

    const bid_count = listing.bids?.length || 0;
    const highest_bid = listing.bids?.[0] || null;

    res.json({ listing: { ...listing, bid_count, highest_bid } });
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/listings
router.post('/', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const {
      title, description, category, condition,
      starting_price, reserve_price, buy_now_price,
      auction_end_time, location,
      ai_estimated_value_low, ai_estimated_value_high,
    } = req.body;

    if (!title || !starting_price || !auction_end_time) {
      return res.status(400).json({ error: 'title, starting_price, and auction_end_time are required' });
    }

    const endTime = new Date(auction_end_time);
    const now = new Date();
    if (endTime <= now) {
      return res.status(400).json({ error: 'auction_end_time must be in the future' });
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        seller_id: req.user.id,
        title,
        description,
        category,
        condition,
        starting_price: parseFloat(starting_price),
        reserve_price: reserve_price ? parseFloat(reserve_price) : null,
        buy_now_price: buy_now_price ? parseFloat(buy_now_price) : null,
        current_price: parseFloat(starting_price),
        auction_end_time: endTime.toISOString(),
        status: 'active',
        location,
        ai_estimated_value_low: ai_estimated_value_low ? parseFloat(ai_estimated_value_low) : null,
        ai_estimated_value_high: ai_estimated_value_high ? parseFloat(ai_estimated_value_high) : null,
      })
      .select()
      .single();

    if (listingError) {
      return res.status(500).json({ error: listingError.message });
    }

    // Insert photos if uploaded
    if (req.files && req.files.length > 0) {
      const photos = req.files.map((file, index) => ({
        listing_id: listing.id,
        url: file.path,
        public_id: file.filename,
        is_primary: index === 0,
        sort_order: index,
      }));

      const { error: photoError } = await supabase
        .from('listing_photos')
        .insert(photos);

      if (photoError) {
        console.error('Photo insert error:', photoError);
      }
    }

    // Fetch the full listing with photos
    const { data: fullListing } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('id', listing.id)
      .single();

    res.status(201).json({ listing: fullListing });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/listings/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id, bids(count)')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this listing' });
    }

    const bidCount = listing.bids?.[0]?.count || 0;
    if (bidCount > 0) {
      return res.status(400).json({ error: 'Cannot edit listing with existing bids' });
    }

    const {
      title, description, category, condition,
      starting_price, reserve_price, buy_now_price,
      auction_end_time, location,
    } = req.body;

    const updates = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category) updates.category = category;
    if (condition) updates.condition = condition;
    if (starting_price) {
      updates.starting_price = parseFloat(starting_price);
      updates.current_price = parseFloat(starting_price);
    }
    if (reserve_price !== undefined) updates.reserve_price = reserve_price ? parseFloat(reserve_price) : null;
    if (buy_now_price !== undefined) updates.buy_now_price = buy_now_price ? parseFloat(buy_now_price) : null;
    if (auction_end_time) updates.auction_end_time = new Date(auction_end_time).toISOString();
    if (location !== undefined) updates.location = location;

    const { data: updated, error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ listing: updated });
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /api/listings/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id, bids(count)')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this listing' });
    }

    const bidCount = listing.bids?.[0]?.count || 0;
    if (bidCount > 0) {
      return res.status(400).json({ error: 'Cannot delete listing with existing bids' });
    }

    const { error } = await supabase
      .from('listings')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Listing cancelled successfully' });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ error: 'Failed to cancel listing' });
  }
});

// POST /api/listings/:id/verify
router.post('/:id/verify', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_photos } = req.body;

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to verify this listing' });
    }

    const { data: updated, error } = await supabase
      .from('listings')
      .update({ verified: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ listing: updated, message: 'Listing verified' });
  } catch (err) {
    console.error('Verify listing error:', err);
    res.status(500).json({ error: 'Failed to verify listing' });
  }
});

export default router;
