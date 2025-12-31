# Backend Dockerfile

# Stage 1: Build the application
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript project
RUN npm run build

# Stage 2: Create the production image
FROM node:20-slim

WORKDIR /usr/src/app

# Copy production dependencies from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

# Copy compiled code from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy prisma schema
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/server.js"]
