# Fix: Cannot find module '@prisma/client'

## Problem
```
Cannot find module '@prisma/client' or its corresponding type declarations.
```

## Solution

Prisma Client needs to be generated first. Run these commands:

```bash
cd backend

# 1. Install dependencies (if not done yet)
npm install

# 2. Generate Prisma Client
npm run prisma:generate
```

After running `prisma:generate`, the `@prisma/client` module will be created in `node_modules/@prisma/client` and the TypeScript error will disappear.

## Why this happens

Prisma Client is a **generated** client library. It doesn't exist until you run `prisma generate`, which:
- Reads `prisma/schema.prisma`
- Generates TypeScript types and client code
- Creates `node_modules/@prisma/client`

## Quick fix command

```bash
cd backend && npm install && npm run prisma:generate
```

After this, the error in `seed.ts` should be resolved.

