/**
 * Sign In Page
 *
 * Email/password sign-in form using Supabase Auth.
 * Shows a setup message if Supabase is not configured.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase";
import { signIn } from "../actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">

      <div className="w-full max-w-md">
        {isSupabaseConfigured ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <p className="text-gray-600 text-sm mt-1">
                Sign in to your account
              </p>
            </CardHeader>
            <CardContent>
              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form action={signIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Your password"
                    required
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full">
                  Sign In
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign up
                </Link>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Authentication Not Configured</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                To enable sign-in, add your Supabase keys to{" "}
                <code className="bg-gray-100 px-1 rounded-sm">.env.local</code>
                :
              </p>
              <pre className="bg-gray-100 p-3 rounded-sm text-sm overflow-x-auto">
                {`NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...`}
              </pre>
              <p className="text-sm text-gray-500">
                Get your keys from{" "}
                <a
                  href="https://supabase.com/dashboard"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  supabase.com/dashboard
                </a>
              </p>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
