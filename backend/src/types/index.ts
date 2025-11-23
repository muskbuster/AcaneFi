export interface Trader {
  id: number;
  address: string;
  traderId: number;
  name: string;
  strategyDescription: string;
  performanceFee: number;
  registeredAt: Date;
}

export interface Deposit {
  id: number;
  userAddress: string;
  traderId: number;
  amount: number;
  chain: string;
  timestamp: Date;
}

export interface Position {
  id: number;
  traderId: number;
  positionType: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  status: 'open' | 'closed';
  openedAt: Date;
  closedAt?: Date;
}

export interface Signal {
  id: number;
  traderId: number;
  signalType: 'LONG' | 'SHORT';
  asset: string;
  size: number;
  price?: number;
  status: 'pending' | 'executed' | 'rejected';
  createdAt: Date;
  executedAt?: Date;
}

export interface TradeParams {
  traderId: number;
  signalType: 'LONG' | 'SHORT';
  asset: string;
  size: number;
  price?: number;
}

export interface MockTradeResult {
  tradeId: string;
  status: 'completed' | 'failed';
  pnl: number;
  entryPrice: number;
  currentPrice: number;
}

