/**
 * Next.js Proxy (Middleware)
 *
 * Handles Supabase auth session refresh and route protection.
 * Add route patterns to protectedRoutes to require authentication.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Check if Supabase is configured
const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only the auth-gated dashboard route is protected; trading pages are public
const protectedRoutes: string[] = [];

export default async function proxy(req: NextRequest) {
  // If Supabase is not configured, allow all requests through
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request: req });

  // Dynamically import to avoid errors when Supabase is not configured
  const { createServerClient } = await import("@supabase/ssr");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: Always call getUser() to refresh the session cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if the current route is protected
  const isProtected = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Redirect unauthenticated users to sign-in
  if (isProtected && !user) {
    const signInUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
