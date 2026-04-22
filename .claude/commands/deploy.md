---
description: Deploy the project to Vercel
---

## Deploy to Vercel

Please help me deploy this project to Vercel.

1. First, check if there are any uncommitted changes with `git status`
   - If there are changes, ask if I want to commit them first

2. Run `npm run build` to verify the project builds successfully
   - If the build fails, help me fix the errors before proceeding

3. Check if Vercel CLI is installed by running `npx vercel --version`
   - If not available, it will be installed automatically via npx

4. Deploy to Vercel:
   - For preview deployment: `npx vercel`
   - For production deployment: `npx vercel --prod`

5. After deployment, provide me with:
   - The deployment URL
   - Any next steps (like setting up environment variables)

IMPORTANT REMINDERS:
- Make sure to set up environment variables in Vercel dashboard for Supabase:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- The first deployment may ask you to link to an existing project or create a new one
