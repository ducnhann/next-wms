# Next WMS

A warehouse management system for the course SE100.

## Project Structure

```txt
next-wms/
├── apps/
│   └── web/              # Next.js web application (port 3001)
└── packages/
    ├── api/              # tRPC API routes and procedures
    ├── auth/             # Better Auth authentication
    └── db/               # Drizzle ORM database schema and migrations
```

## Tech Stack

- **Framework:** Next.js 16
- **API:** tRPC
- **Database:** Drizzle ORM + Neon (PostgreSQL)
- **Auth:** Better Auth
- **UI:** React 19, Tailwind 4, Shadcn
- **Monorepo:** Turborepo + pnpm workspaces
- **Validation:** Zod
- **Code Quality:** Biome

## Prerequisites

- Node.js 20+
- pnpm 10.18.3+
- PostgreSQL database (or Neon account)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Create `.env` files in `apps/web/` based on .env.example.

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"
```

### 3. Database Setup

```bash
# Generate migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# Open Drizzle Studio (optional)
pnpm db:studio
```

### 4. Run Development Server

```bash
# Run all apps
pnpm dev

# Or run web app only
pnpm dev:web
```

The web app will be available at `http://localhost:3000`.

## Available Scripts

### Root Commands

```bash
pnpm dev              # Run all apps in development mode
pnpm build            # Build all packages and apps
pnpm check-types      # Type check all packages
pnpm check            # Run Biome linter and formatter
```

### Web App Commands

```bash
pnpm dev:web          # Run web app only
```

### Database Commands

```bash
pnpm db:generate      # Generate new migrations
pnpm db:push          # Push schema changes to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio
```

## Package Details

### `@next-wms/api`

- tRPC router definitions
- API procedures and middleware
- Type-safe API client

### `@next-wms/auth`

- Better Auth configuration
- Authentication middleware
- User session management

### `@next-wms/db`

- Drizzle ORM schema
- Database migrations
- Database client exports

## Development Workflow

1. Make changes to packages in `packages/*`
2. Changes are automatically picked up (no build needed in dev)
3. Run type checking: `pnpm check-types`
4. Format code: `pnpm check`
5. Commit and push

## Building for Production

```bash
# Build all packages and apps
pnpm build

# Start production server
cd apps/web
pnpm start
```

## Troubleshooting

### TypeScript can't find workspace packages

Make sure dependencies are installed and TypeScript server is restarted:

```bash
pnpm install
# In VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Database connection issues

- Verify `DATABASE_URL` in `.env`
- Check database is accessible
- Run `pnpm db:push` to sync schema

## License

Private
