/**
 * Loading Component
 *
 * Shown during route transitions.
 */

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        {/* Animated loading spinner with gradient */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>

        {/* Loading text */}
        <p className="text-lg font-medium text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
