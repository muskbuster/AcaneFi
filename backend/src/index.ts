import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { teeRouter } from './api/tee.js';
import { tradeRouter } from './api/trade.js';
import { layerzeroRouter } from './api/layerzero.js';
import { cctpRouter } from './api/cctp.js';
import { rariRouter } from './api/rari.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/tee', teeRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/layerzero', layerzeroRouter);
app.use('/api/cctp', cctpRouter);
app.use('/api/rari', rariRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 ArcaneFi Backend running on port ${PORT}`);
});

