// PM2 Ecosystem Configuration (ES Module)
// Usage: pm2 start ecosystem.config.js

export default {
  apps: [
    {
      name: 'arcanefi-api',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader tsx/esm',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
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

