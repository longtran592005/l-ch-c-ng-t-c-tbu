# ================================================
# Frontend Dockerfile - Multi-stage Build
# ================================================
# Stage 1: Build Vite React app
# Stage 2: Serve static files with Nginx

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (cache layer)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM alpine:latest

# Copy built files from builder
COPY --from=builder /app/dist /app/dist

# Nginx config sẽ được mount qua docker-compose (nginx/nginx.conf)
# Container này chỉ copy static files ra volume chia sẻ với Nginx
CMD ["sh", "-c", "cp -r /app/dist/* /usr/share/nginx/html/ && echo 'Frontend files copied successfully'"]

