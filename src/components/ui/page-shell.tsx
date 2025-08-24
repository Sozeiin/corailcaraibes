import React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn('min-h-screen p-4 sm:p-6', className)}>
      {children}
    </div>
  );
}

export default PageShell;
