# AGENTS.md - Developer Guide for Innatus

This is a Next.js 14 application called "Innatus" - a task management app with AI-powered features.

## Build, Lint, and Test Commands

```bash
# Development
npm run dev              # Start Next.js development server
npm run build            # Build for production
npm run start            # Start production server

# Linting
npm run lint             # Run ESLint

# Database (Drizzle ORM + PostgreSQL)
npm run generate         # Generate database migrations (drizzle-kit generate:pg)
npm run migrate          # Run migrations
npm run studio           # Open Drizzle Studio

# Scripts
npm run transfer-data    # Run data transfer script
```

**No test framework is currently configured.** If adding tests, use Vitest or Jest.

## Project Structure

```
/app                     # Next.js App Router
  /api                   # API routes (route.ts files)
  /src                   # Android native code
/components/ui           # shadcn/ui components
/lib                     # Utility functions
/drizzle                 # Database schema and config
/scripts                 # Migration/transfer scripts
```

## Code Style Guidelines

### TypeScript
- Use explicit types for function parameters and return values when not obvious
- Enable strict mode in tsconfig.json (already enabled)
- Use `interface` for object shapes, `type` for unions/aliases

### Imports
- Use path aliases: `@/*` maps to project root
- Order imports: external libs → internal modules → local utils
- Example: `import { NextRequest, NextResponse } from 'next/server'`

### Naming Conventions
- **Files**: kebab-case for utilities (`utils.ts`), PascalCase for components and routes
- **Variables**: camelCase
- **Database tables**: snake_case (e.g., `action_items`)
- **React Components**: PascalCase

### Error Handling (API Routes)
- Always wrap route handlers in try/catch
- Return appropriate HTTP status codes:
  - 401 for unauthorized
  - 400 for bad request / missing fields
  - 404 for not found
  - 500 for server errors
- Log errors with `console.error()` before returning
- Never expose internal error details to clients

Example pattern:
```typescript
export async function handler(request: NextRequest) {
  try {
    // ... logic
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ... more logic
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in handler:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
```

### Database (Drizzle ORM)
- Use `drizzle-orm/pg-core` for table definitions
- Define schemas in `drizzle/schema.ts`
- Use migrations: `npm run generate` then `npm run migrate`
- Always filter by `userId` for multi-tenant security

### Authentication
- Use Clerk: `import { auth } from '@clerk/nextjs/server'`
- Always verify `userId` before database operations

### React Components
- Use server components by default in App Router
- Use `"use client"` directive only when needed (hooks, event handlers)
- Follow shadcn/ui patterns for UI components
- Use `cn()` utility for className merging (from `lib/utils.ts`)

### Tailwind CSS
- Use shadcn/ui design tokens (colors from `tailwind.config.ts`)
- Use `hsl(var(--variable))` for theme colors
- Follow existing patterns in `app/globals.css`

### Cursor Rules (from .cursor/rules/)

1. **shortupdates.mdc**: Always prefer short and local updates first to allow testing before spreading changes across the repo.

2. **minimizecomponents.mdc**: 
   - Keep the project as simple as possible
   - Add as few elements as possible
   - Think about editability through standard programs
   - Avoid custom programming when standard solutions work
   - Propose best practices proactively

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- Clerk environment variables (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, etc.)

## Adding New Features

1. Create API routes in `/app/api/[feature]/route.ts`
2. Add database schema in `/drizzle/schema.ts`
3. Run `npm run generate` then `npm run migrate`
4. Add frontend components in `/components` or `/app`
5. Run `npm run lint` before committing
