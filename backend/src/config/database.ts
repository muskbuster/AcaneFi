import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database schema
export async function initializeDatabase() {
  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not configured. Database features will be unavailable.');
    return;
  }

  try {
    const client = await pool.connect();
    try {
      // Create traders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS traders (
          id SERIAL PRIMARY KEY,
          address VARCHAR(42) UNIQUE NOT NULL,
          trader_id INTEGER UNIQUE NOT NULL,
          name VARCHAR(255),
          strategy_description TEXT,
          performance_fee DECIMAL(5,2) DEFAULT 0.00,
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create deposits table
      await client.query(`
        CREATE TABLE IF NOT EXISTS deposits (
          id SERIAL PRIMARY KEY,
          user_address VARCHAR(42) NOT NULL,
          trader_id INTEGER NOT NULL,
          amount DECIMAL(20,6) NOT NULL,
          chain VARCHAR(50) NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (trader_id) REFERENCES traders(trader_id)
        );
      `);

      // Create positions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS positions (
          id SERIAL PRIMARY KEY,
          trader_id INTEGER NOT NULL,
          position_type VARCHAR(10) NOT NULL,
          size DECIMAL(20,6) NOT NULL,
          entry_price DECIMAL(20,6) NOT NULL,
          current_price DECIMAL(20,6),
          pnl DECIMAL(20,6) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'open',
          opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          closed_at TIMESTAMP,
          FOREIGN KEY (trader_id) REFERENCES traders(trader_id)
        );
      `);

      // Create signals table
      await client.query(`
        CREATE TABLE IF NOT EXISTS signals (
          id SERIAL PRIMARY KEY,
          trader_id INTEGER NOT NULL,
          signal_type VARCHAR(10) NOT NULL,
          asset VARCHAR(50) NOT NULL,
          size DECIMAL(20,6) NOT NULL,
          price DECIMAL(20,6),
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          executed_at TIMESTAMP,
          FOREIGN KEY (trader_id) REFERENCES traders(trader_id)
        );
      `);

      console.log('✅ Database schema initialized');
    } catch (error: any) {
      console.error('❌ Database initialization error:', error.message);
      // Don't throw - allow server to start without database
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.warn('⚠️  Could not connect to database:', error.message);
    console.warn('   Server will continue without database. Some features may be unavailable.');
    // Don't throw - allow server to start without database
  }
}

