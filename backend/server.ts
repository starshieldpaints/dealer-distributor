import { env } from './config/env';
import { app } from './app';
import { pool } from './db/pool';
import { redisClient } from './lib/redis';
import { logger } from './logger';

const PORT = env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('----------------------------------------');
    console.log(`🔌 Attempting to connect to database at: ${env.DB_HOST}:${env.DB_PORT}`);
    console.log(`👤 User: ${env.DB_USER}`);
    console.log(`🗄️  Database: ${env.DB_NAME}`);
    console.log('----------------------------------------');

    // 1. Check Database Connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');

    // 2. Check Redis Connection (if enabled)
    if (redisClient) {
      console.log('✅ Redis client initialized');
    }

    // 3. Start Server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
      console.log(`👉 http://localhost:${PORT}\n`);
    });

  } catch (error: any) {
    console.error('\n❌ CRITICAL STARTUP ERROR ❌');
    console.error('----------------------------------------');
    // Print the full error object structure
    console.error(error); 
    console.error('----------------------------------------');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('👉 HINT: Is your PostgreSQL server running?');
      console.error('👉 HINT: Check DB_HOST in your .env file (use "localhost" for local dev).');
    }
    if (error.code === '28P01') {
      console.error('👉 HINT: Password authentication failed. Check DB_PASS in .env.');
    }
    if (error.code === '3D000') {
      console.error(`👉 HINT: Database "${env.DB_NAME}" does not exist. Run "createdb ${env.DB_NAME}".`);
    }

    process.exit(1);
  }
};

startServer();