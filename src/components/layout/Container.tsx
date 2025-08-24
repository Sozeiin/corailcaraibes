import React from "react";

/**
 * Centers page content and constrains its maximum width.
 *
 * @example
 * ```tsx
 * import { Container } from "@/components/layout/Container";
 *
 * export function Example() {
 *   return (
 *     <Container>
 *       <p>Your content</p>
 *     </Container>
 *   );
 * }
 * ```
 */
export function Container({ children }: { children: React.ReactNode }) {
  return <div className="container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">{children}</div>;
}
