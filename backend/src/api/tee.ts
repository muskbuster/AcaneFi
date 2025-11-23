import { Router } from 'express';
import { validateTrader, AuthRequest } from '../middleware/auth.js';
import { teeService } from '../services/teeService.js';
import { tradeService } from '../services/tradeService.js';
import { z } from 'zod';

export const teeRouter = Router();

// Register trader
const registerTraderSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  name: z.string().min(1).max(255),
  strategyDescription: z.string().optional(),
  performanceFee: z.number().min(0).max(100),
});

teeRouter.post('/register-trader', async (req, res) => {
  try {
    const validated = registerTraderSchema.parse(req.body);
    const result = await teeService.registerTrader(
      validated.address,
      validated.name,
      validated.strategyDescription || '',
      validated.performanceFee
    );

    res.json({
      success: true,
      traderId: result.traderId,
      trader: result.trader,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('Register trader error:', error);
    res.status(500).json({ error: 'Failed to register trader' });
  }
});

// Validate deposit permission
teeRouter.get('/validate-deposit/:traderId', async (req, res) => {
  try {
    const traderId = parseInt(req.params.traderId);
    const validation = await teeService.validateDeposit(traderId);

    if (!validation.valid) {
      return res.status(404).json({ error: validation.error });
    }

    res.json({
      valid: true,
      trader: validation.trader,
    });
  } catch (error) {
    console.error('Validate deposit error:', error);
    res.status(500).json({ error: 'Failed to validate deposit' });
  }
});

// Submit trading signal
const submitSignalSchema = z.object({
  signalType: z.enum(['LONG', 'SHORT']),
  asset: z.string().min(1),
  size: z.number().positive(),
  price: z.number().positive().optional(),
});

teeRouter.post('/submit-signal', validateTrader, async (req: AuthRequest, res) => {
  try {
    if (!req.trader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validated = submitSignalSchema.parse(req.body);
    const signal = await teeService.submitSignal(
      req.trader.traderId,
      validated.signalType,
      validated.asset,
      validated.size,
      validated.price
    );

    res.json({
      success: true,
      signal,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('Submit signal error:', error);
    res.status(500).json({ error: 'Failed to submit signal' });
  }
});

// Execute trade
teeRouter.post('/execute-trade', async (req, res) => {
  try {
    const { traderId, signalType, asset, size, price } = req.body;

    const tradeResult = await tradeService.executeMockTrade({
      traderId,
      signalType,
      asset,
      size,
      price,
    });

    res.json({
      success: true,
      trade: tradeResult,
    });
  } catch (error) {
    console.error('Execute trade error:', error);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

// Get all traders
teeRouter.get('/traders', async (req, res) => {
  try {
    const traders = await teeService.getAllTraders();
    res.json({ traders });
  } catch (error) {
    console.error('Get traders error:', error);
    res.status(500).json({ error: 'Failed to get traders' });
  }
});

// Get trader by ID
teeRouter.get('/traders/:traderId', async (req, res) => {
  try {
    const traderId = parseInt(req.params.traderId);
    const trader = await teeService.getTraderById(traderId);

    if (!trader) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    res.json({ trader });
  } catch (error) {
    console.error('Get trader error:', error);
    res.status(500).json({ error: 'Failed to get trader' });
  }
});

// Get trader signals
teeRouter.get('/traders/:traderId/signals', async (req, res) => {
  try {
    const traderId = parseInt(req.params.traderId);
    const signals = await teeService.getTraderSignals(traderId);
    res.json({ signals });
  } catch (error) {
    console.error('Get signals error:', error);
    res.status(500).json({ error: 'Failed to get signals' });
  }
});

// Verify and receive Rari deposit
const verifyRariDepositSchema = z.object({
  amount: z.string().regex(/^\d+$/), // Amount in wei (6 decimals for USDC)
  nonce: z.string().regex(/^\d+$/), // Nonce as string
  sourceChainId: z.string().regex(/^\d+$/), // Source chain ID (Rari)
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/), // Signature hex string
});

// Create position
const createPositionSchema = z.object({
  traderId: z.number().int().positive(),
  traderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/), // EIP-191 signature
  tokenType: z.enum(['ETH', 'WBTC', 'ZEC']),
  amountIn: z.string().regex(/^\d+$/), // Amount of USDC to swap (6 decimals)
});

teeRouter.post('/verify-rari-deposit', async (req, res) => {
  try {
    const validated = verifyRariDepositSchema.parse(req.body);
    
    const result = await teeService.verifyAndReceiveRariDeposit(
      validated.amount,
      validated.nonce,
      validated.sourceChainId,
      validated.signature
    );

    res.json({
      success: true,
      verified: result.verified,
      deposit: result.deposit,
      transactionHash: result.transactionHash,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('Verify Rari deposit error:', error);
    res.status(500).json({ error: 'Failed to verify Rari deposit' });
  }
});

// Create position
teeRouter.post('/create-position', async (req, res) => {
  try {
    const validated = createPositionSchema.parse(req.body);
    
    const result = await teeService.createPosition(
      validated.traderId,
      validated.traderAddress,
      validated.signature,
      validated.tokenType,
      validated.amountIn
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }

    res.json({
      success: true,
      position: result.position,
      transactionHash: result.transactionHash,
      message: result.message,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('Create position error:', error);
    res.status(500).json({ 
      error: 'Failed to create position',
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

