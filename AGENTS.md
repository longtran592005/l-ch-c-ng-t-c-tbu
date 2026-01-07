# AGENTS.md

This file contains guidelines and commands for agentic coding agents working in this TBU Schedule Management System repository.

## Project Overview

This is a full-stack schedule management system for Thai Binh University (TBU) with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- **Backend**: Node.js + Express + TypeScript + Prisma + SQL Server
- **Features**: Schedule management, meeting records, audio-to-text conversion, AI-powered chatbot, user authentication

## Build Commands

### Frontend (Root Directory)
```bash
# Development
npm run dev                    # Start dev server on port 8080

# Build
npm run build                  # Production build
npm run build:dev             # Development build

# Linting & Type Checking
npm run lint                   # Run ESLint
npm run typecheck              # Run TypeScript compiler (if available)

# Preview
npm run preview                # Preview production build
```

### Backend (Backend Directory)
```bash
# Development
npm run dev                    # Start with tsx watch

# Build
npm run build                  # TypeScript compilation

# Production
npm run start                  # Start compiled server

# Database
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations
npm run prisma:db:push         # Push schema to DB
npm run prisma:studio          # Open Prisma Studio
npm run prisma:seed            # Seed database

# Testing
npm run test                   # Run Vitest tests
npm run test:coverage          # Run tests with coverage
npm run test:file             # Run single test file (example: vitest run auth.test.ts)

# Linting
npm run lint                   # ESLint check
npm run lint:fix              # ESLint auto-fix
```

## Code Style Guidelines

### General Principles
- Follow existing code patterns and conventions
- Use TypeScript for type safety
- Keep components small and focused
- Use descriptive variable and function names
- Write clean, readable code with proper formatting

### Import Organization
```typescript
// 1. React and core libraries
import React, { useState, useEffect } from 'react';
import { Request, Response } from 'express';

// 2. Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';

// 3. Internal imports (use @ alias)
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { User } from '@/types';
```

### TypeScript Configuration
- **Frontend**: Relaxed TypeScript with `noImplicitAny: false`
- **Backend**: Strict TypeScript with full type checking
- Use interfaces for object shapes
- Prefer explicit return types for functions
- Use generics for reusable components

### Component Patterns (Frontend)

#### Shadcn/ui Components
```typescript
// Follow existing button component pattern
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(/* ... */);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Component logic
  }
);
Button.displayName = "Button";
```

#### Custom Hooks
```typescript
// Use descriptive names with 'use' prefix
export function useDebounce<T>(value: T, delay: number): T {
  // Hook implementation
}

export function useAuth() {
  // Auth hook implementation
}
```

#### API Services
```typescript
// Use consistent error handling patterns
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, data: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(data) }),
  // ... other methods
};
```

### Backend Patterns

#### Controller Structure
```typescript
export const controllerAction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.method(req.body);
    res.status(200).json({ message: 'Success', data: result });
  } catch (error) {
    next(error);
  }
};
```

#### Service Layer
```typescript
// Keep business logic in services
export const serviceMethod = async (data: InputType): Promise<ReturnType> => {
  // Validation and business logic
  // Database operations
  // Return result
};
```

#### Error Handling
```typescript
// Use consistent error patterns
throw new Error('Descriptive error message');

// In controllers, pass errors to middleware
catch (error) {
  next(error);
}
```

### Naming Conventions

#### Files and Folders
- **Components**: PascalCase (e.g., `UserProfile.tsx`, `ScheduleViewer.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth.ts`, `useDebounce.ts`)
- **Services**: camelCase (e.g., `api.ts`, `auth.service.ts`)
- **Utilities**: camelCase (e.g., `utils.ts`, `dateHelpers.ts`)
- **Types**: camelCase (e.g., `types.ts`, `user.types.ts`)

#### Variables and Functions
```typescript
// Variables: camelCase
const userName = 'John';
const scheduleData = [];

// Functions: camelCase with descriptive names
const getUserById = (id: string) => {};
const formatScheduleDate = (date: Date) => {};

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Types/Interfaces: PascalCase
interface UserProfile {
  id: string;
  name: string;
}

type ScheduleStatus = 'active' | 'inactive' | 'pending';
```

### CSS and Styling

#### Tailwind CSS Patterns
```typescript
// Use cn() utility for conditional classes
import { cn } from "@/lib/utils";

const className = cn(
  "base-classes",
  {
    "conditional-class": condition,
    "another-class": anotherCondition,
  },
  additionalClasses
);

// Follow design system colors
className="bg-primary text-primary-foreground hover:bg-primary/90"
className="border border-input bg-background hover:bg-accent"
```

#### Custom CSS Variables
```css
/* Use CSS custom properties for theming */
:root {
  --university-navy: hsl(213, 54%, 24%);
  --university-gold: hsl(45, 100%, 50%);
  --radius: 0.5rem;
  --shadow-card: 0 4px 20px -2px hsl(213 54% 24% / 0.08);
}
```

### Database Patterns

#### Prisma Schema
```prisma
// Use descriptive model names
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  schedules Schedule[]
}

// Use proper field types and constraints
model Schedule {
  id          String   @id @default(cuid())
  title       String
  startDate   DateTime
  endDate     DateTime
  isPublished Boolean  @default(false)
  
  // Relations
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
```

### Testing Guidelines

#### Test Structure
```typescript
// Use Vitest for backend testing
import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should register user successfully', async () => {
    // Test implementation
    expect(result).toBeDefined();
  });
});
```

## Environment Variables

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=TBU Schedule Management
```

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
API_PREFIX=/api
DATABASE_URL="sqlserver://localhost:1433;database=tbu_schedule;trustServerCertificate=true"
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

## Common Issues and Solutions

### Frontend
- **API Connection**: Ensure backend is running and VITE_API_BASE_URL is set
- **Import Errors**: Use @ alias for internal imports
- **Type Errors**: Check tsconfig.json for relaxed TypeScript settings

### Backend
- **Database Connection**: Verify SQL Server is running and connection string is correct
- **Prisma Issues**: Run `npm run prisma:generate` after schema changes
- **CORS Errors**: Check CORS middleware configuration

## Development Workflow

1. **Start Backend**: `cd backend && npm run dev`
2. **Start Frontend**: `npm run dev` (in root)
3. **Database Changes**: Update Prisma schema, run migrations
4. **Testing**: Run tests before committing
5. **Linting**: Fix linting issues before PR

## Architecture Notes

- **Frontend**: Component-based with React Router, Context API for state management
- **Backend**: Layered architecture (Controller → Service → Repository)
- **Database**: SQL Server with Prisma ORM
- **Authentication**: JWT-based with refresh tokens
- **File Upload**: Multer for handling audio files
- **AI Integration**: External services for audio-to-text and chatbot functionality

This file should be updated as the project evolves and new patterns emerge.