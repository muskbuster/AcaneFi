import * as fs from 'fs';
import * as path from 'path';

export interface RariDeposit {
  id: string; // Unique ID (nonce + timestamp)
  userAddress: string;
  amount: string; // Amount in wei (6 decimals)
  amountFormatted: string; // Amount in USDC (human readable)
  nonce: string;
  sourceChainId: string;
  depositTxHash: string;
  createdAt: string; // ISO timestamp
  redeemed: boolean;
  redeemedAt?: string; // ISO timestamp
  redeemTxHash?: string;
}

export interface CCTPDeposit {
  id: string; // Unique ID (txHash + timestamp)
  userAddress: string;
  transactionHash: string;
  sourceDomain: number; // CCTP source domain (0 = Ethereum Sepolia, 6 = Base Sepolia, etc.)
  sourceChainId: number; // Chain ID for display
  sourceChainName: string; // Human readable chain name
  createdAt: string; // ISO timestamp
  redeemed: boolean;
  redeemedAt?: string; // ISO timestamp
  redeemTxHash?: string;
  attestation?: {
    message: string;
    attestation: string;
    status: string;
  };
}

const RARI_STORAGE_FILE = path.join(process.cwd(), 'data', 'rari-deposits.json');
const CCTP_STORAGE_FILE = path.join(process.cwd(), 'data', 'cctp-deposits.json');
const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Simple JSON file-based storage for Rari deposits
 */
export class RariDepositStorage {
  private deposits: Map<string, RariDeposit> = new Map();

  constructor() {
    this.loadFromFile();
  }

  /**
   * Load deposits from JSON file
   */
  private loadFromFile(): void {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Load from file if it exists
      if (fs.existsSync(RARI_STORAGE_FILE)) {
        const data = fs.readFileSync(RARI_STORAGE_FILE, 'utf-8');
        const depositsArray: RariDeposit[] = JSON.parse(data);
        this.deposits = new Map(depositsArray.map(d => [d.id, d]));
        console.log(`✅ Loaded ${this.deposits.size} Rari deposits from storage`);
      } else {
        console.log('📝 No existing Rari deposit storage found, starting fresh');
      }
    } catch (error: any) {
      console.error('❌ Error loading Rari deposits:', error.message);
      // Start with empty storage on error
      this.deposits = new Map();
    }
  }

  /**
   * Save deposits to JSON file
   */
  private saveToFile(): void {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Convert map to array and save
      const depositsArray = Array.from(this.deposits.values());
      fs.writeFileSync(RARI_STORAGE_FILE, JSON.stringify(depositsArray, null, 2), 'utf-8');
      console.log(`💾 Saved ${depositsArray.length} Rari deposits to storage`);
    } catch (error: any) {
      console.error('❌ Error saving Rari deposits:', error.message);
      throw error;
    }
  }

  /**
   * Store a new Rari deposit
   */
  storeDeposit(deposit: Omit<RariDeposit, 'id' | 'createdAt' | 'redeemed'>): RariDeposit {
    const id = `${deposit.nonce}-${Date.now()}`;
    const newDeposit: RariDeposit = {
      ...deposit,
      id,
      createdAt: new Date().toISOString(),
      redeemed: false,
    };

    this.deposits.set(id, newDeposit);
    this.saveToFile();

    console.log(`📝 Stored Rari deposit: ${id} (${deposit.amountFormatted} USDC)`);
    return newDeposit;
  }

  /**
   * Get all deposits for a user
   */
  getUserDeposits(userAddress: string): RariDeposit[] {
    return Array.from(this.deposits.values())
      .filter(d => d.userAddress.toLowerCase() === userAddress.toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get all unredeemed deposits for a user
   */
  getUnredeemedDeposits(userAddress: string): RariDeposit[] {
    return this.getUserDeposits(userAddress).filter(d => !d.redeemed);
  }

  /**
   * Get all unredeemed deposits (any user)
   */
  getAllUnredeemedDeposits(): RariDeposit[] {
    return Array.from(this.deposits.values())
      .filter(d => !d.redeemed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get deposit by ID
   */
  getDeposit(id: string): RariDeposit | undefined {
    return this.deposits.get(id);
  }

  /**
   * Get deposit by nonce
   */
  getDepositByNonce(nonce: string, userAddress?: string): RariDeposit | undefined {
    const deposits = userAddress 
      ? this.getUserDeposits(userAddress)
      : Array.from(this.deposits.values());
    
    return deposits.find(d => d.nonce === nonce && !d.redeemed);
  }

  /**
   * Mark deposit as redeemed
   */
  markAsRedeemed(id: string, redeemTxHash: string): RariDeposit | null {
    const deposit = this.deposits.get(id);
    if (!deposit) {
      return null;
    }

    deposit.redeemed = true;
    deposit.redeemedAt = new Date().toISOString();
    deposit.redeemTxHash = redeemTxHash;

    this.saveToFile();
    console.log(`✅ Marked Rari deposit ${id} as redeemed: ${redeemTxHash}`);

    return deposit;
  }

  /**
   * Mark deposit as redeemed by nonce
   */
  markAsRedeemedByNonce(nonce: string, redeemTxHash: string, userAddress?: string): RariDeposit | null {
    const deposit = this.getDepositByNonce(nonce, userAddress);
    if (!deposit) {
      return null;
    }

    return this.markAsRedeemed(deposit.id, redeemTxHash);
  }
}

/**
 * Simple JSON file-based storage for CCTP deposits
 */
export class CCTPDepositStorage {
  private deposits: Map<string, CCTPDeposit> = new Map();

  constructor() {
    this.loadFromFile();
  }

  /**
   * Load deposits from JSON file
   */
  private loadFromFile(): void {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Load from file if it exists
      if (fs.existsSync(CCTP_STORAGE_FILE)) {
        const data = fs.readFileSync(CCTP_STORAGE_FILE, 'utf-8');
        const depositsArray: CCTPDeposit[] = JSON.parse(data);
        this.deposits = new Map(depositsArray.map(d => [d.id, d]));
        console.log(`✅ Loaded ${this.deposits.size} CCTP deposits from storage`);
      } else {
        console.log('📝 No existing CCTP deposit storage found, starting fresh');
      }
    } catch (error: any) {
      console.error('❌ Error loading CCTP deposits:', error.message);
      // Start with empty storage on error
      this.deposits = new Map();
    }
  }

  /**
   * Save deposits to JSON file
   */
  private saveToFile(): void {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Convert map to array and save
      const depositsArray = Array.from(this.deposits.values());
      fs.writeFileSync(CCTP_STORAGE_FILE, JSON.stringify(depositsArray, null, 2), 'utf-8');
      console.log(`💾 Saved ${depositsArray.length} CCTP deposits to storage`);
    } catch (error: any) {
      console.error('❌ Error saving CCTP deposits:', error.message);
      throw error;
    }
  }

  /**
   * Store a new CCTP deposit
   */
  storeDeposit(deposit: Omit<CCTPDeposit, 'id' | 'createdAt' | 'redeemed'>): CCTPDeposit {
    const id = `${deposit.transactionHash}-${Date.now()}`;
    const newDeposit: CCTPDeposit = {
      ...deposit,
      id,
      createdAt: new Date().toISOString(),
      redeemed: false,
    };

    this.deposits.set(id, newDeposit);
    this.saveToFile();

    console.log(`📝 Stored CCTP deposit: ${id} (${deposit.sourceChainName})`);
    return newDeposit;
  }

  /**
   * Get all deposits for a user
   */
  getUserDeposits(userAddress: string): CCTPDeposit[] {
    return Array.from(this.deposits.values())
      .filter(d => d.userAddress.toLowerCase() === userAddress.toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get all unredeemed deposits for a user
   */
  getUnredeemedDeposits(userAddress: string): CCTPDeposit[] {
    return this.getUserDeposits(userAddress).filter(d => !d.redeemed);
  }

  /**
   * Get all unredeemed deposits (any user)
   */
  getAllUnredeemedDeposits(): CCTPDeposit[] {
    return Array.from(this.deposits.values())
      .filter(d => !d.redeemed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get deposit by ID
   */
  getDeposit(id: string): CCTPDeposit | undefined {
    return this.deposits.get(id);
  }

  /**
   * Get deposit by transaction hash
   */
  getDepositByTxHash(transactionHash: string, userAddress?: string): CCTPDeposit | undefined {
    const deposits = userAddress 
      ? this.getUserDeposits(userAddress)
      : Array.from(this.deposits.values());
    
    return deposits.find(d => d.transactionHash.toLowerCase() === transactionHash.toLowerCase() && !d.redeemed);
  }

  /**
   * Update attestation for a deposit
   */
  updateAttestation(id: string, attestation: { message: string; attestation: string; status: string }): CCTPDeposit | null {
    const deposit = this.deposits.get(id);
    if (!deposit) {
      return null;
    }

    deposit.attestation = attestation;
    this.saveToFile();

    return deposit;
  }

  /**
   * Mark deposit as redeemed (and delete from storage)
   */
  markAsRedeemed(id: string, redeemTxHash: string): CCTPDeposit | null {
    const deposit = this.deposits.get(id);
    if (!deposit) {
      return null;
    }

    // Delete from storage instead of marking as redeemed
    this.deposits.delete(id);
    this.saveToFile();
    console.log(`✅ Deleted CCTP deposit ${id} after successful receive: ${redeemTxHash}`);

    return deposit;
  }

  /**
   * Mark deposit as redeemed by transaction hash (and delete from storage)
   */
  markAsRedeemedByTxHash(transactionHash: string, redeemTxHash: string, userAddress?: string): CCTPDeposit | null {
    const deposit = this.getDepositByTxHash(transactionHash, userAddress);
    if (!deposit) {
      return null;
    }

    return this.markAsRedeemed(deposit.id, redeemTxHash);
  }
}

// Singleton instances
export const rariDepositStorage = new RariDepositStorage();
export const cctpDepositStorage = new CCTPDepositStorage();

