import { pool } from '../config/database.js';
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

    // Create position in database
    await this.createPosition({
      traderId: params.traderId,
      positionType: params.signalType,
      size: params.size,
      entryPrice,
      currentPrice,
      pnl,
    });

    return {
      tradeId,
      status: 'completed',
      pnl,
      entryPrice,
      currentPrice,
    };
  }

  /**
   * Get trader positions
   */
  async getTraderPositions(traderId: number): Promise<Position[]> {
    const result = await pool.query(
      `SELECT * FROM positions 
       WHERE trader_id = $1 AND status = 'open'
       ORDER BY opened_at DESC`,
      [traderId]
    );

    return result.rows.map((row) => this.mapRowToPosition(row));
  }

  /**
   * Update position prices (simulate market movement)
   */
  async updatePositionPrices(): Promise<void> {
    const result = await pool.query(
      "SELECT * FROM positions WHERE status = 'open'"
    );

    for (const row of result.rows) {
      const newPrice = this.calculateCurrentPrice(
        parseFloat(row.entry_price),
        row.position_type
      );
      const newPnl = this.calculatePnl(
        parseFloat(row.size),
        parseFloat(row.entry_price),
        newPrice,
        row.position_type
      );

      await pool.query(
        `UPDATE positions 
         SET current_price = $1, pnl = $2
         WHERE id = $3`,
        [newPrice, newPnl, row.id]
      );
    }
  }

  /**
   * Close position
   */
  async closePosition(positionId: number): Promise<void> {
    await pool.query(
      `UPDATE positions 
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [positionId]
    );
  }

  // Private helper methods
  private async createPosition(position: {
    traderId: number;
    positionType: 'LONG' | 'SHORT';
    size: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO positions (trader_id, position_type, size, entry_price, current_price, pnl, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
      [
        position.traderId,
        position.positionType,
        position.size,
        position.entryPrice,
        position.currentPrice,
        position.pnl,
      ]
    );
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

  private mapRowToPosition(row: any): Position {
    return {
      id: row.id,
      traderId: row.trader_id,
      positionType: row.position_type,
      size: parseFloat(row.size),
      entryPrice: parseFloat(row.entry_price),
      currentPrice: row.current_price ? parseFloat(row.current_price) : parseFloat(row.entry_price),
      pnl: parseFloat(row.pnl),
      status: row.status,
      openedAt: row.opened_at,
      closedAt: row.closed_at || undefined,
    };
  }
}

export const tradeService = new TradeService();

