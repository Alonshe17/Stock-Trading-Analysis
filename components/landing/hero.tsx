/**
 * Hero Section Component
 *
 * Minimal starting point for the landing page.
 */

import { Container } from "@/components/layout/container";

export function Hero() {
  return (
    <section className="py-20 sm:py-32">
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          {/* Main headline */}
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Your App Name
          </h1>

          {/* Description */}
          <p className="mb-8 text-lg text-gray-600 sm:text-xl">
            A Next.js starter template with Tailwind CSS, Supabase Auth,
            and everything you need to get started.
          </p>
        </div>
      </Container>
    </section>
  );
}
