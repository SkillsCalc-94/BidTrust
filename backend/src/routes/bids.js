import { Router } from 'express';
import supabase from '../config/supabase.js';
import authenticate from '../middleware/auth.js';

const router = Router();

// GET /api/bids/:listingId
router.get('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    const { data: bids, error } = await supabase
      .from('bids')
      .select(`
        id, amount, created_at, status,
        bidder:profiles!bids_bidder_id_fkey(id, full_name)
      `)
      .eq('listing_id', listingId)
      .neq('status', 'retracted')
      .order('amount', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Anonymize bidder names — show only first name + last initial
    const anonymizedBids = bids.map(bid => ({
      ...bid,
      bidder: bid.bidder
        ? {
            id: bid.bidder.id,
            display_name: anonymizeName(bid.bidder.full_name),
          }
        : null,
    }));

    res.json({ bids: anonymizedBids });
  } catch (err) {
    console.error('Get bids error:', err);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

function anonymizeName(fullName) {
  if (!fullName) return 'Anonymous';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// POST /api/bids/:listingId
router.post('/:listingId', authenticate, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Valid bid amount is required' });
    }

    const bidAmount = parseFloat(amount);

    // Fetch current listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, starting_price, current_price, status, auction_end_time, buy_now_price')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not active' });
    }

    if (new Date(listing.auction_end_time) <= new Date()) {
      return res.status(400).json({ error: 'Auction has ended' });
    }

    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ error: 'Sellers cannot bid on their own listings' });
    }

    if (bidAmount < listing.starting_price) {
      return res.status(400).json({ error: `Bid must be at least $${listing.starting_price}` });
    }

    if (bidAmount <= (listing.current_price || listing.starting_price)) {
      return res.status(400).json({ error: `Bid must be higher than current price of $${listing.current_price}` });
    }

    // Insert bid
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .insert({
        listing_id: listingId,
        bidder_id: req.user.id,
        amount: bidAmount,
        status: 'active',
      })
      .select()
      .single();

    if (bidError) {
      return res.status(500).json({ error: bidError.message });
    }

    // Update listing current price
    await supabase
      .from('listings')
      .update({ current_price: bidAmount })
      .eq('id', listingId);

    res.status(201).json({ bid });
  } catch (err) {
    console.error('Place bid error:', err);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// DELETE /api/bids/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the bid
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('*, listing:listings!bids_listing_id_fkey(auction_end_time)')
      .eq('id', id)
      .single();

    if (bidError || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.bidder_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to retract this bid' });
    }

    // Check listing ends in >24 hours
    const auctionEnd = new Date(bid.listing.auction_end_time);
    const hoursUntilEnd = (auctionEnd - new Date()) / (1000 * 60 * 60);

    if (hoursUntilEnd <= 24) {
      return res.status(400).json({ error: 'Cannot retract bid within 24 hours of auction end' });
    }

    // Check no subsequent bids by others
    const { data: subsequentBids } = await supabase
      .from('bids')
      .select('id')
      .eq('listing_id', bid.listing_id)
      .neq('bidder_id', req.user.id)
      .gt('created_at', bid.created_at)
      .neq('status', 'retracted');

    if (subsequentBids && subsequentBids.length > 0) {
      return res.status(400).json({ error: 'Cannot retract bid when others have bid after you' });
    }

    // Retract the bid
    await supabase
      .from('bids')
      .update({ status: 'retracted' })
      .eq('id', id);

    // Recalculate current price from remaining bids
    const { data: remainingBids } = await supabase
      .from('bids')
      .select('amount')
      .eq('listing_id', bid.listing_id)
      .neq('status', 'retracted')
      .order('amount', { ascending: false })
      .limit(1);

    const { data: listing } = await supabase
      .from('listings')
      .select('starting_price')
      .eq('id', bid.listing_id)
      .single();

    const newPrice = remainingBids?.[0]?.amount || listing?.starting_price;

    await supabase
      .from('listings')
      .update({ current_price: newPrice })
      .eq('id', bid.listing_id);

    res.json({ message: 'Bid retracted successfully' });
  } catch (err) {
    console.error('Retract bid error:', err);
    res.status(500).json({ error: 'Failed to retract bid' });
  }
});

export default router;
