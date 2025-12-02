// import { createServer } from 'http';
// import { createApp } from './app';
// import { config } from './config';
// import { logger } from './logger';
// import { pool } from './db/pool';
// import { closeRedis } from './lib/redis';
// import { env } from './config/env';
// import { app } from './app';
// import { pool } from './db/pool';
// import { redisClient } from './lib/redis';
// import { logger } from './logger';

// const app = createApp();
// const server = createServer(app);

// server.listen(config.port, () => {
//   logger.info({ port: config.port }, 'API server started');
// });

// const shutdown = async (signal: string) => {
//   logger.info({ signal }, 'Shutting down');
//   server.close(() => {
//     logger.info('HTTP server closed');
//   });
//   await pool.end();
//   await closeRedis();
//   process.exit(0);
// };

// process.on('SIGTERM', () => {
//   void shutdown('SIGTERM');
// });

// process.on('SIGINT', () => {
//   void shutdown('SIGINT');
// });
// Import env before anything else to ensure variables are loaded

import { env } from './config/env';
import { app } from './app';
import { pool } from './db/pool';

const PORT = env.PORT || 3000;

const startServer = async () => {
  console.log('\n==================================================');
  console.log('🚀 STARTING SERVER IN DEBUG MODE');
  console.log('==================================================');
  
  // 1. Debug Environment
  console.log(`\n📋 CONFIGURATION:`);
  console.log(`   - DB Host: ${env.DB_HOST}`);
  console.log(`   - DB Port: ${env.DB_PORT}`);
  console.log(`   - DB Name: ${env.DB_NAME}`);

  // 2. Test Database Connection
  try {
    console.log(`\n📡 Connecting to Database...`);
    await pool.query('SELECT 1');
    console.log('✅ Database Connection: SUCCESS');
  } catch (dbError: any) {
    console.error('\n❌ CRITICAL DATABASE ERROR ❌');
    console.error('--------------------------------------------------');
    console.error(`Error Code: ${dbError.code}`);
    console.error(`Message:    ${dbError.message}`);
    console.error('--------------------------------------------------');
    
    if (dbError.code === 'ECONNREFUSED') {
      console.error('💡 FIX: PostgreSQL is not running or Host is wrong.');
      console.error('   1. Ensure backend/.env has "DB_HOST=127.0.0.1"');
      console.error('   2. Check if Postgres service is running in Windows Services.');
    } else if (dbError.code === '28P01') {
      console.error('💡 FIX: Wrong Password. Update DB_PASS in backend/.env');
    } else if (dbError.code === '3D000') {
      console.error(`💡 FIX: Database "${env.DB_NAME}" does not exist.`);
      console.error(`   Run: createdb -U postgres ${env.DB_NAME}`);
    }
    
    process.exit(1);
  }

  // 3. Start Express App
  try {
    app.listen(PORT, () => {
      console.log(`\n✅ Server is ready!`);
      console.log(`👉 URL: http://localhost:${PORT}`);
      console.log('==================================================\n');
    });
  } catch (appError) {
    console.error('❌ FAILED TO OPEN PORT:', appError);
  }
};

startServer();