# AI Study Buddy

This project is built with [Next.js](https://nextjs.org) and now ships with a Drizzle ORM + Supabase setup for relational data access.

## Database Setup

- **Drizzle config**: `drizzle.config.ts` reads `DATABASE_URL` and emits migrations to `./drizzle`.
- **Runtime client**: `src/lib/db/client.ts` creates a shared `pg` pool against Supabase and exports a Drizzle instance.
- **Schema**: start from `src/lib/db/schema.ts` when you are ready to model tables with the `pgTable` helpers.

### Required environment variables

Add the following to `.env` (never commit production secrets):

```
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- `DATABASE_URL` powers Drizzle migrations and the pooled Postgres client.
- Keep the service role key server-side only. The helper in `src/lib/supabase/server.ts` already guards against accidental client usage.

### Supabase TypeScript definitions

Generate strongly typed response objects and copy them into `src/lib/db/types.ts`:

```
supabase gen types typescript --project-id your-project-ref > src/lib/db/types.ts
```

That enables `@supabase/supabase-js` and Drizzle to share a single `Database` type.

### Drizzle CLI commands

```
npm run db:generate   # generate SQL migration files from schema changes
npm run db:push       # push the latest schema to Supabase
npm run db:migrate    # execute pending migrations against the database
```

## Getting Started

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app running. Start editing inside `src/app` and the page will hot reload.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - core concepts and APIs
- [Drizzle ORM Docs](https://orm.drizzle.team) - schema definitions, queries, and migrations
- [Supabase Docs](https://supabase.com/docs) - project management and database guides

## Deploy on Vercel

Deploy this project with [Vercel](https://vercel.com/new) to take advantage of platform features such as Edge Functions and storage.
