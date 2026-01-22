/**
 * Server Entry Point
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import app from './app';
import env from './config/env';
import prisma from './config/database';

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // SSL Certificate paths (từ thư mục ssl ở root project)
    const sslPath = path.resolve(__dirname, '../../ssl');
    const sslOptions = {
      key: fs.readFileSync(path.join(sslPath, 'key.pem')),
      cert: fs.readFileSync(path.join(sslPath, 'cert.pem')),
    };

    // Start HTTPS server - bind to 0.0.0.0 để có thể truy cập từ mạng LAN
    const HOST = '0.0.0.0';
    https.createServer(sslOptions, app).listen(env.PORT, HOST, () => {
      console.log(`🔒 HTTPS Server running on https://localhost:${env.PORT}`);
      console.log(`📱 Có thể truy cập từ mạng LAN tại https://<IP-máy-tính>:${env.PORT}`);
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 API prefix: ${env.API_PREFIX}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

