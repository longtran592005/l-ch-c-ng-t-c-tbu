/**
 * Server Entry Point
 * - Production: HTTP server (Nginx handles SSL termination)
 * - Development: HTTPS server (self-signed certs for local dev)
 */

import http from 'http';
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

    const HOST = '0.0.0.0';

    if (env.NODE_ENV === 'production') {
      // ===== PRODUCTION: HTTP server (Nginx reverse proxy handles SSL) =====
      http.createServer(app).listen(env.PORT, HOST, () => {
        console.log(`🚀 HTTP Server running on http://localhost:${env.PORT}`);
        console.log(`📝 Environment: ${env.NODE_ENV}`);
        console.log(`🔗 API prefix: ${env.API_PREFIX}`);
        console.log(`💡 SSL is handled by Nginx reverse proxy`);
      });
    } else {
      // ===== DEVELOPMENT: HTTPS server (self-signed certs) =====
      const sslPath = path.resolve(__dirname, '../../ssl');
      try {
        const sslOptions = {
          key: fs.readFileSync(path.join(sslPath, 'key.pem')),
          cert: fs.readFileSync(path.join(sslPath, 'cert.pem')),
        };
        https.createServer(sslOptions, app).listen(env.PORT, HOST, () => {
          console.log(`🔒 HTTPS Server running on https://localhost:${env.PORT}`);
          console.log(`📱 LAN access: https://<IP>:${env.PORT}`);
          console.log(`📝 Environment: ${env.NODE_ENV}`);
          console.log(`🔗 API prefix: ${env.API_PREFIX}`);
        });
      } catch {
        // Fallback to HTTP if SSL certs not found
        console.warn('⚠️  SSL certs not found, falling back to HTTP');
        http.createServer(app).listen(env.PORT, HOST, () => {
          console.log(`🚀 HTTP Server running on http://localhost:${env.PORT}`);
          console.log(`📝 Environment: ${env.NODE_ENV}`);
        });
      }
    }
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

