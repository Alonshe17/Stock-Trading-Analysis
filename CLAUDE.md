# CLAUDE.md - Project Guide

## Project Overview

A Next.js starter template for building and deploying web applications.

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Authentication**: Supabase Auth (optional - works without env vars)
- **Database**: Supabase (Postgres)
- **Deployment**: Vercel

## Key Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production (run before deploying)
npm run lint     # Check for code issues
npm run start    # Run production build locally
```

## Project Structure

```
app/                    # Pages and API routes (file-based routing)
├── page.tsx           # Landing page (home)
├── dashboard/         # Protected user dashboard
├── (auth)/            # Authentication pages + server actions
└── api/               # API routes

components/            # Reusable UI components
├── ui/               # Basic components (Button, Card, Input)
├── layout/           # Layout components (Header, Footer, Container)
└── landing/          # Landing page sections (Hero)

lib/                   # Utility functions
├── supabase.ts       # Supabase client utilities (browser, server, middleware)
└── utils.ts          # General utilities (cn helper)
public/               # Static assets (images, icons)
.claude/              # Claude Code configuration
```

## Coding Standards

- Use TypeScript for all new files
- Components go in `/components` with PascalCase names
- Use Tailwind CSS for styling (no separate CSS files)
- Keep components small and focused

## Working with This Project

### Creating New Pages

Pages live in `/app`. Create a folder with `page.tsx` inside.

```
/app/about/page.tsx    → /about route
/app/contact/page.tsx  → /contact route
/app/blog/[id]/page.tsx → /blog/123 dynamic route
```

### Creating Components

Put reusable components in `/components/ui/`.
Put page-specific sections in `/components/[feature]/`.

### Using Authentication (Supabase)

Supabase Auth is pre-configured but optional. To enable:

1. Create a project at https://supabase.com/dashboard
2. Go to Project Settings → API
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

4. Use Supabase in server components:
   ```tsx
   import { createServerSupabaseClient } from "@/lib/supabase";

   const supabase = await createServerSupabaseClient();
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) redirect("/sign-in");
   ```

5. Use Supabase in client components:
   ```tsx
   import { createClient } from "@/lib/supabase";

   const supabase = createClient();
   ```

### Using the Database (Supabase)

Once Supabase is configured, you can also use it as your database:

```tsx
const supabase = await createServerSupabaseClient();
const { data, error } = await supabase.from("my_table").select("*");
```

Create tables in the Supabase dashboard under Table Editor.

## What NOT to Change (Unless Asked)

- `next.config.ts` - Framework configuration
- `proxy.ts` - Auth middleware (remove entirely if not using auth)
- `lib/supabase.ts` - Supabase client setup
- `.env.local` - Secrets (never commit this file)

## Deployment Checklist

1. Run `npm run build` - fix any errors
2. Commit and push all changes
3. Deploy to Vercel
4. Add environment variables in Vercel dashboard (for Supabase)
