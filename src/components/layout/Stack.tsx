import React from "react";
import { cn } from "@/lib/utils";

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column";
  gap?: string | number;
}

/**
 * Flex container that stacks its children with consistent spacing.
 *
 * @example
 * ```tsx
 * import { Stack } from "@/components/layout/Stack";
 *
 * export function Example() {
 *   return (
 *     <Stack gap="1rem">
 *       <div>Item 1</div>
 *       <div>Item 2</div>
 *     </Stack>
 *   );
 * }
 * ```
 */
export function Stack({
  children,
  direction = "column",
  gap = "1rem",
  className,
  style,
  ...props
}: StackProps) {
  return (
    <div
      className={cn("flex", direction === "row" ? "flex-row" : "flex-col", className)}
      style={{ gap, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
