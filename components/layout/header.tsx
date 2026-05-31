/**
 * Header Component
 *
 * Main navigation header with logo, nav links, and auth buttons.
 */

import Link from "next/link";
import { Container } from "./container";
import { Button } from "@/components/ui/button";
import {
  isSupabaseConfigured,
  createServerSupabaseClient,
} from "@/lib/supabase";
import { SignOutButton } from "./sign-out-button";

export async function Header() {
  // Get current user if Supabase is configured
  let userEmail: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
              <span className="text-lg font-bold text-white">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Stock Trading Analysis</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">Dashboard</Link>
            <Link href="/daily-brief" className="text-gray-600 hover:text-gray-900 transition-colors">Daily Brief</Link>
            <Link href="/market-sentiment" className="text-gray-600 hover:text-gray-900 transition-colors">Sentiment</Link>
            <Link href="/watchlist" className="text-gray-600 hover:text-gray-900 transition-colors">Watchlist</Link>
            <Link href="/screener" className="text-gray-600 hover:text-gray-900 transition-colors">Screener</Link>
            <Link href="/recommendations" className="text-gray-600 hover:text-gray-900 transition-colors">Picks</Link>
            <Link href="/trends" className="text-gray-600 hover:text-gray-900 transition-colors">Trends</Link>
            <Link href="/scanner" className="text-gray-600 hover:text-gray-900 transition-colors">Scanner</Link>
            <Link href="/alerts" className="text-gray-600 hover:text-gray-900 transition-colors">Alerts</Link>
            <Link href="/journal" className="text-gray-600 hover:text-gray-900 transition-colors">Journal</Link>
            <Link href="/methodology" className="text-gray-500 hover:text-gray-900 transition-colors text-sm">Methodology</Link>
          </nav>

          {/* Auth buttons - only show when Supabase is configured */}
          {isSupabaseConfigured && (
            <div className="flex items-center gap-3">
              {userEmail ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    {userEmail}
                  </span>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/sign-in">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button variant="primary" size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}
