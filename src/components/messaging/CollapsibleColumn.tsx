import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CollapsibleColumnProps {
  isVisible: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function CollapsibleColumn({ isVisible, onToggle, children, className, title }: CollapsibleColumnProps) {
  return (
    <div
      className={cn(
        'relative border-r transition-all duration-300 ease-in-out',
        isVisible ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden',
        className
      )}
    >
      {isVisible && (
        <>
          <div className="absolute top-2 right-2 z-10">
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
              className="h-6 w-6 p-0"
              title={`Réduire ${title || 'cette colonne'}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          {children}
        </>
      )}
    </div>
  );
}

interface ExpandColumnButtonProps {
  onClick: () => void;
  title?: string;
}

export function ExpandColumnButton({ onClick, title }: ExpandColumnButtonProps) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className="absolute top-2 left-2 z-10 h-8 w-8 p-0"
      title={`Afficher ${title || 'la colonne'}`}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}
