-- Initial database schema for ArcaneFi
-- This is automatically created by the backend on startup
-- But kept here for reference and manual setup if needed

CREATE TABLE IF NOT EXISTS traders (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) UNIQUE NOT NULL,
  trader_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(255),
  strategy_description TEXT,
  performance_fee DECIMAL(5,2) DEFAULT 0.00,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  trader_id INTEGER NOT NULL,
  amount DECIMAL(20,6) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trader_id) REFERENCES traders(trader_id)
);

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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_traders_address ON traders(address);
CREATE INDEX IF NOT EXISTS idx_traders_trader_id ON traders(trader_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_address);
CREATE INDEX IF NOT EXISTS idx_deposits_trader ON deposits(trader_id);
CREATE INDEX IF NOT EXISTS idx_positions_trader ON positions(trader_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_signals_trader ON signals(trader_id);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);

