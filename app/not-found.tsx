/**
 * 404 Not Found Page
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="mb-4 text-9xl font-bold text-gray-900">404</h1>

        {/* Message */}
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Page Not Found
        </h2>
        <p className="mb-8 text-gray-600">
          Looks like you&apos;ve wandered into uncharted territory!
        </p>

        {/* Back to home button */}
        <Link href="/">
          <Button variant="primary" size="lg">
            Go Back Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
