import { Router } from 'express';
import { validateTrader, AuthRequest } from '../middleware/auth.js';
import { tradeService } from '../services/tradeService.js';

export const tradeRouter = Router();

// Get trader positions
tradeRouter.get('/positions/:traderId', async (req, res) => {
  try {
    const traderId = parseInt(req.params.traderId);
    const positions = await tradeService.getTraderPositions(traderId);
    res.json({ positions });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Failed to get positions' });
  }
});

// Update position prices (simulate market movement)
tradeRouter.post('/update-prices', async (req, res) => {
  try {
    await tradeService.updatePositionPrices();
    res.json({ success: true, message: 'Prices updated' });
  } catch (error) {
    console.error('Update prices error:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

// Close position
tradeRouter.post('/close-position/:positionId', validateTrader, async (req: AuthRequest, res) => {
  try {
    const positionId = parseInt(req.params.positionId);
    await tradeService.closePosition(positionId);
    res.json({ success: true, message: 'Position closed' });
  } catch (error) {
    console.error('Close position error:', error);
    res.status(500).json({ error: 'Failed to close position' });
  }
});

