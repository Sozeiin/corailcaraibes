import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft } from 'lucide-react';

interface SharedBoatsIndicatorProps {
  ownerBaseName: string;
  sharedWithBaseName?: string;
  variant?: 'compact' | 'full';
}

export function SharedBoatsIndicator({ 
  ownerBaseName, 
  sharedWithBaseName,
  variant = 'full' 
}: SharedBoatsIndicatorProps) {
  if (variant === 'compact') {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <ArrowRightLeft className="h-3 w-3 mr-1" />
        ONE WAY
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
      <ArrowRightLeft className="h-3 w-3 mr-1" />
      ONE WAY - depuis {ownerBaseName}
      {sharedWithBaseName && ` → ${sharedWithBaseName}`}
    </Badge>
  );
}
