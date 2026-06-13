import { Router } from 'express';
import Stripe from 'stripe';
import supabase from '../config/supabase.js';
import authenticate from '../middleware/auth.js';

const router = Router();
let _stripe = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured yet');
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

const PLATFORM_FEE_PERCENT = 0.05; // 5%

// POST /api/payments/create-payment-intent
router.post('/create-payment-intent', authenticate, async (req, res) => {
  try {
    const { listing_id, bid_id, offer_id } = req.body;

    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }
    if (!bid_id && !offer_id) {
      return res.status(400).json({ error: 'Either bid_id or offer_id is required' });
    }

    // Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, title, status')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    let winningAmount;

    if (bid_id) {
      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .select('amount, bidder_id, listing_id')
        .eq('id', bid_id)
        .single();

      if (bidError || !bid) {
        return res.status(404).json({ error: 'Bid not found' });
      }
      if (bid.listing_id !== listing_id) {
        return res.status(400).json({ error: 'Bid does not belong to this listing' });
      }
      if (bid.bidder_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to pay for this bid' });
      }
      winningAmount = bid.amount;
    } else {
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('amount, buyer_id, listing_id, status')
        .eq('id', offer_id)
        .single();

      if (offerError || !offer) {
        return res.status(404).json({ error: 'Offer not found' });
      }
      if (offer.listing_id !== listing_id) {
        return res.status(400).json({ error: 'Offer does not belong to this listing' });
      }
      if (offer.buyer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to pay for this offer' });
      }
      if (offer.status !== 'accepted') {
        return res.status(400).json({ error: 'Offer has not been accepted' });
      }
      winningAmount = offer.amount;
    }

    const platformFee = Math.round(winningAmount * PLATFORM_FEE_PERCENT * 100);
    const totalAmountCents = Math.round(winningAmount * 100) + platformFee;

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: totalAmountCents,
      currency: 'usd',
      capture_method: 'manual', // escrow hold
      metadata: {
        listing_id,
        bid_id: bid_id || '',
        offer_id: offer_id || '',
        buyer_id: req.user.id,
        seller_id: listing.seller_id,
        platform_fee_cents: platformFee,
      },
      description: `BidTrust purchase: ${listing.title}`,
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: winningAmount,
      platform_fee: platformFee / 100,
      total: totalAmountCents / 100,
    });
  } catch (err) {
    console.error('Create payment intent error:', err);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// POST /api/payments/confirm-payment
router.post('/confirm-payment', authenticate, async (req, res) => {
  try {
    const { payment_intent_id, listing_id } = req.body;

    if (!payment_intent_id || !listing_id) {
      return res.status(400).json({ error: 'payment_intent_id and listing_id are required' });
    }

    const paymentIntent = await getStripe().paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.metadata.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!['requires_capture', 'succeeded'].includes(paymentIntent.status)) {
      return res.status(400).json({ error: `Payment not ready. Status: ${paymentIntent.status}` });
    }

    // Create transaction record
    const platformFeeCents = parseInt(paymentIntent.metadata.platform_fee_cents || '0');
    const totalAmount = paymentIntent.amount / 100;
    const platformFee = platformFeeCents / 100;
    const sellerAmount = totalAmount - platformFee;

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        listing_id,
        buyer_id: req.user.id,
        seller_id: paymentIntent.metadata.seller_id,
        amount: sellerAmount,
        platform_fee: platformFee,
        stripe_payment_intent_id: payment_intent_id,
        status: 'held',
      })
      .select()
      .single();

    if (txError) {
      return res.status(500).json({ error: txError.message });
    }

    // Update listing status
    await supabase
      .from('listings')
      .update({ status: 'payment_held' })
      .eq('id', listing_id);

    res.json({ transaction, message: 'Payment confirmed and held in escrow' });
  } catch (err) {
    console.error('Confirm payment error:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// POST /api/payments/release-payment
router.post('/release-payment', authenticate, async (req, res) => {
  try {
    const { payment_intent_id, listing_id } = req.body;

    if (!payment_intent_id || !listing_id) {
      return res.status(400).json({ error: 'payment_intent_id and listing_id are required' });
    }

    // Fetch transaction to verify authorization (buyer or admin)
    const { data: transaction, error: txFetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .single();

    if (txFetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Allow buyer or seller to confirm delivery
    if (transaction.buyer_id !== req.user.id && transaction.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to release this payment' });
    }

    // Capture the payment (release from escrow to seller)
    const capturedIntent = await getStripe().paymentIntents.capture(payment_intent_id);

    // Update transaction
    await supabase
      .from('transactions')
      .update({
        status: 'released',
        delivered_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', payment_intent_id);

    // Update listing status to sold
    await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing_id);

    // Update seller stats
    await supabase.rpc('increment_total_sales', { seller_id: transaction.seller_id }).catch(() => {});
    await supabase.rpc('increment_total_purchases', { buyer_id: transaction.buyer_id }).catch(() => {});

    res.json({ message: 'Payment released to seller', status: capturedIntent.status });
  } catch (err) {
    console.error('Release payment error:', err);
    res.status(500).json({ error: 'Failed to release payment' });
  }
});

// POST /api/payments/refund
router.post('/refund', authenticate, async (req, res) => {
  try {
    const { payment_intent_id, reason } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({ error: 'payment_intent_id is required' });
    }

    const { data: transaction, error: txFetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .single();

    if (txFetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Only buyer or admin can request refund
    if (transaction.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to refund this payment' });
    }

    const paymentIntent = await getStripe().paymentIntents.retrieve(payment_intent_id);

    let result;
    if (paymentIntent.status === 'requires_capture') {
      // Cancel (not yet captured)
      result = await getStripe().paymentIntents.cancel(payment_intent_id);
    } else if (paymentIntent.status === 'succeeded') {
      // Refund captured payment
      result = await getStripe().refunds.create({
        payment_intent: payment_intent_id,
        reason: reason || 'requested_by_customer',
      });
    } else {
      return res.status(400).json({ error: `Cannot refund payment in status: ${paymentIntent.status}` });
    }

    // Update records
    await supabase
      .from('transactions')
      .update({ status: 'refunded' })
      .eq('stripe_payment_intent_id', payment_intent_id);

    await supabase
      .from('listings')
      .update({ status: 'active' })
      .eq('id', transaction.listing_id);

    res.json({ message: 'Refund processed successfully', result });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// POST /api/payments/webhook — Stripe webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        console.log('PaymentIntent succeeded:', pi.id);
        await supabase
          .from('transactions')
          .update({ status: 'held' })
          .eq('stripe_payment_intent_id', pi.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        console.log('PaymentIntent failed:', pi.id, pi.last_payment_error?.message);
        await supabase
          .from('transactions')
          .update({ status: 'pending' })
          .eq('stripe_payment_intent_id', pi.id);
        break;
      }

      case 'payment_intent.canceled': {
        const pi = event.data.object;
        await supabase
          .from('transactions')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', pi.id);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
});

// GET /api/payments/transaction/:listingId
router.get('/transaction/:listingId', authenticate, async (req, res) => {
  try {
    const { listingId } = req.params;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('listing_id', listingId)
      .single();

    if (error || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.buyer_id !== req.user.id && transaction.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this transaction' });
    }

    res.json({ transaction });
  } catch (err) {
    console.error('Get transaction error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

export default router;
