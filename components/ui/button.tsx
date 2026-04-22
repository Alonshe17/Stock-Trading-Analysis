/**
 * Button Component
 *
 * Reusable button with variant and size props.
 */

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Define the available variants and sizes
const variants = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  secondary:
    "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
  outline:
    "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500",
  ghost:
    "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

// TypeScript interface for button props
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

// Button component with forwardRef for compatibility with form libraries
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center rounded-lg font-semibold",
          "transition-all duration-200 ease-in-out",
          "focus:outline-hidden focus:ring-2 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transform hover:scale-105 active:scale-100",
          // Apply variant and size
          variants[variant],
          sizes[size],
          // Allow custom classes to override
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
