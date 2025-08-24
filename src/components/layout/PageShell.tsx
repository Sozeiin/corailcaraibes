import React from "react";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  );
}
