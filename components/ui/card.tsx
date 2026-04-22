/**
 * Card Component
 *
 * Flexible card for displaying grouped content.
 */

import { cn } from "@/lib/utils";

// Card container
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white shadow-lg overflow-hidden",
        "transition-all duration-300 hover:shadow-xl",
        className
      )}
      {...props}
    />
  );
}

// Card header section
export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 pt-6 pb-2", className)}
      {...props}
    />
  );
}

// Card title
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xl font-bold text-gray-900",
        className
      )}
      {...props}
    />
  );
}

// Card description (subtitle)
export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-gray-500 mt-1", className)}
      {...props}
    />
  );
}

// Card main content area
export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 py-4", className)}
      {...props}
    />
  );
}

// Card footer section
export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 bg-gray-50 border-t border-gray-100",
        className
      )}
      {...props}
    />
  );
}
