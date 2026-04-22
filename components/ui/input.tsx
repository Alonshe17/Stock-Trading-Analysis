/**
 * Input Component
 *
 * Styled input field for forms.
 */

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          // Base styles
          "w-full rounded-lg border bg-white px-4 py-3",
          "text-gray-900 placeholder:text-gray-400",
          "transition-all duration-200",
          // Focus styles
          "focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          // Default border
          "border-gray-300",
          // Error state
          error && "border-red-500 focus:ring-red-500",
          // Disabled state
          "disabled:bg-gray-100 disabled:cursor-not-allowed",
          // Allow custom classes
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

/**
 * Label Component
 * ===============
 *
 * A styled label for form inputs.
 */
export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-gray-700 mb-1",
        className
      )}
      {...props}
    />
  );
}
