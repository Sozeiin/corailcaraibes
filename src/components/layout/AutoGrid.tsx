import React from "react";
import { cn } from "@/lib/utils";

interface AutoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum width for each grid item. */
  minColumnWidth?: string;
}

/**
 * Responsive CSS grid that automatically fits items based on the available width.
 *
 * @example
 * ```tsx
 * import { AutoGrid } from "@/components/layout/AutoGrid";
 *
 * export function Example() {
 *   return (
 *     <AutoGrid minColumnWidth="16rem">
 *       <div>Item 1</div>
 *       <div>Item 2</div>
 *       <div>Item 3</div>
 *     </AutoGrid>
 *   );
 * }
 * ```
 */
export function AutoGrid({
  children,
  minColumnWidth = "16rem",
  className,
  style,
  ...props
}: AutoGridProps) {
  return (
    <div
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}, 1fr))`, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
