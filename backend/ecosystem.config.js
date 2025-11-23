// PM2 Ecosystem Configuration (ES Module)
// Usage: pm2 start ecosystem.config.js
// Note: Run from backend directory: cd backend && pm2 start ecosystem.config.js

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  apps: [
    {
      name: 'arcanefi-api',
      script: join(__dirname, 'src/index.ts'),
      interpreter: 'node',
      interpreter_args: '--import tsx/esm',
      instances: 1,
      exec_mode: 'fork',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: join(__dirname, 'logs/pm2-error.log'),
      out_file: join(__dirname, 'logs/pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

