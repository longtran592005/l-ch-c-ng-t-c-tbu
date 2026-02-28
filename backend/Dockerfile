# ================================================
# Backend Dockerfile - Express API + Prisma
# ================================================
# Multi-stage build for production

# --- Stage 1: Build ---
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-slim

WORKDIR /usr/src/app

# Install OpenSSL (required by Prisma)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy production files from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY package*.json ./

# Create uploads directory
RUN mkdir -p uploads/tts/male uploads/tts/female

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "dist/server.js"]
