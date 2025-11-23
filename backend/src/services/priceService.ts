/**
 * Price Service
 * Fetches token prices from free APIs (CoinGecko, CoinCap, etc.)
 */

export interface TokenPrice {
  symbol: string;
  price: number; // Price in USDC (USD)
  timestamp: number;
}

export class PriceService {
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute cache

  /**
   * Get price for a token from CoinGecko (free API)
   * @param tokenId CoinGecko token ID (e.g., 'ethereum', 'bitcoin', 'zcash')
   */
  async getPriceFromCoinGecko(tokenId: string): Promise<number> {
    // Check cache first
    const cached = this.cache.get(tokenId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.price;
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const price = data[tokenId]?.usd;

      if (!price || price <= 0) {
        throw new Error(`Invalid price for ${tokenId}`);
      }

      // Cache the price
      this.cache.set(tokenId, { price, timestamp: Date.now() });

      return price;
    } catch (error: any) {
      console.error(`Failed to fetch price for ${tokenId}:`, error.message);
      throw new Error(`Price fetch failed: ${error.message}`);
    }
  }

  /**
   * Get price for ETH, WBTC, or ZEC
   */
  async getTokenPrice(tokenType: 'ETH' | 'WBTC' | 'ZEC'): Promise<number> {
    const tokenMap: Record<string, string> = {
      ETH: 'ethereum',
      WBTC: 'wrapped-bitcoin', // or 'bitcoin' for BTC
      ZEC: 'zcash',
    };

    const tokenId = tokenMap[tokenType];
    if (!tokenId) {
      throw new Error(`Unknown token type: ${tokenType}`);
    }

    return this.getPriceFromCoinGecko(tokenId);
  }

  /**
   * Get price in USDC (6 decimals format)
   * Returns price * 1e6 for USDC compatibility
   */
  async getTokenPriceInUSDC(tokenType: 'ETH' | 'WBTC' | 'ZEC'): Promise<bigint> {
    const price = await this.getTokenPrice(tokenType);
    // Convert to USDC format (6 decimals)
    return BigInt(Math.floor(price * 1e6));
  }
}

export const priceService = new PriceService();

