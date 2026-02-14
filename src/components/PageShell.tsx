import React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export const PageShell = ({ children, className }: PageShellProps) => {
  return <div className={cn(className)}>{children}</div>;
};

