---
description: Create a new page with proper structure
argument-hint: [page-name]
---

## Create New Page

Create a new page at `/app/$ARGUMENTS/page.tsx`.

Before creating, please ask me:
1. What should this page be about?
2. Should it be a protected page (require login)?

Then create the page with:

1. **File Header Comment** - Explaining the page purpose
2. **Metadata Export** - For SEO (title, description)
3. **Proper Imports** - Using existing components from the project:
   - `Header` from `@/components/layout/header`
   - `Container` from `@/components/layout/container`
   - UI components as needed
4. **Layout Structure** - Following the pattern from other pages
5. **Placeholder Content** - That I can easily customize

If it's a protected page:
- Add the authentication check using `createServerSupabaseClient()` from `@/lib/supabase`
- Redirect to `/sign-in` if not authenticated

Follow the existing code style and patterns in this project.
Use Tailwind CSS for styling, matching the minimal design of the rest of the app.
