/**
 * Browser-only Supabase client — safe to import in Client Components.
 * Does NOT import next/headers or any server-only modules.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
