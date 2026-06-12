import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import listingsRoutes from './routes/listings.js';
import bidsRoutes from './routes/bids.js';
import offersRoutes from './routes/offers.js';
import paymentsRoutes from './routes/payments.js';
import aiRoutes from './routes/ai.js';
import scanRoutes from './routes/scan.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook needs raw body — must come before json middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'BidTrust API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scan', scanRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`BidTrust API running on port ${PORT}`);
});

export default app;
