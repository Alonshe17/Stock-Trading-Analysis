# Next.js Starter Template

A Next.js starter template with Tailwind CSS, Supabase Auth, and Vercel deployment.

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd boilerplate

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.sample .env.local

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Project Structure

```
app/                    # Pages and routes
├── page.tsx           # Home/landing page
├── dashboard/         # Protected dashboard
├── (auth)/            # Sign in/up pages
└── api/               # API routes

components/            # Reusable components
├── ui/               # Button, Card, Input
├── layout/           # Header, Footer
└── landing/          # Hero

lib/                   # Utilities (Supabase client, helpers)
```

## Features

- **Next.js 16** with App Router
- **Tailwind CSS 4**
- **Supabase Auth + DB** (optional) - just add your keys
- **Vercel Ready** - deploy in minutes

## Adding Authentication & Database

1. Create a Supabase project at https://supabase.com/dashboard
2. Go to Project Settings → API and copy your keys
3. Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

4. The auth features will automatically work!

## Deployment

```bash
npm run build
npx vercel --prod
```

Don't forget to add your environment variables in the Vercel dashboard.

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Project guide
- [PREREQUISITES.md](./PREREQUISITES.md) - Setup requirements

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Check for issues |
