import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

/**
 * Displays an image that scales responsively and loads lazily by default.
 *
 * @example
 * ```tsx
 * import { ResponsiveImage } from "@/components/layout/ResponsiveImage";
 *
 * export function Example() {
 *   return <ResponsiveImage src="/logo.png" alt="Logo" />;
 * }
 * ```
 */
export function ResponsiveImage({ className, ...props }: ResponsiveImageProps) {
  return <img loading="lazy" className={cn("w-full h-auto", className)} {...props} />;
}
