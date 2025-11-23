import { TradeParams, MockTradeResult, Position } from '../types/index.js';

export class TradeService {
  /**
   * Execute mock trade (for demo purposes)
   */
  async executeMockTrade(params: TradeParams): Promise<MockTradeResult> {
    // Simulate trade execution
    const entryPrice = this.generateMockPrice();
    const currentPrice = this.calculateCurrentPrice(entryPrice, params.signalType);
    const pnl = this.calculateMockPnl(params, entryPrice, currentPrice);
    const tradeId = this.generateMockId();

    // Positions are tracked on-chain, not in database

    return {
      tradeId,
      status: 'completed',
      pnl,
      entryPrice,
      currentPrice,
    };
  }

  /**
   * Get trader positions (returns empty - positions are tracked on-chain)
   */
  async getTraderPositions(traderId: number): Promise<Position[]> {
    // Positions are tracked on-chain via createPosition
    // To get positions, would need to query on-chain events
    // For now, return empty array
    return [];
  }

  /**
   * Update position prices (no-op - positions are tracked on-chain)
   */
  async updatePositionPrices(): Promise<void> {
    // Positions are tracked on-chain
  }

  /**
   * Close position (no-op - positions are tracked on-chain)
   */
  async closePosition(positionId: number): Promise<void> {
    // Positions are tracked on-chain
  }

  private generateMockPrice(): number {
    // Generate random price between 1000 and 5000
    return Math.random() * 4000 + 1000;
  }

  private calculateCurrentPrice(
    entryPrice: number,
    signalType: 'LONG' | 'SHORT'
  ): number {
    // Simulate price movement: LONG positions tend to go up, SHORT down
    const volatility = 0.05; // 5% volatility
    const trend = signalType === 'LONG' ? 1.15 : 0.85; // 15% gain for LONG, 15% loss for SHORT
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    return entryPrice * trend * randomFactor;
  }

  private calculateMockPnl(
    params: TradeParams,
    entryPrice: number,
    currentPrice: number
  ): number {
    return this.calculatePnl(params.size, entryPrice, currentPrice, params.signalType);
  }

  private calculatePnl(
    size: number,
    entryPrice: number,
    currentPrice: number,
    positionType: 'LONG' | 'SHORT'
  ): number {
    if (positionType === 'LONG') {
      return ((currentPrice - entryPrice) / entryPrice) * size;
    } else {
      return ((entryPrice - currentPrice) / entryPrice) * size;
    }
  }

  private generateMockId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

}

export const tradeService = new TradeService();

