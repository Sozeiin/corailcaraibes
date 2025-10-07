import React from 'react';
import { Link, Package, Anchor, Wrench, Box, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SmartThreadEntity } from '@/types/messaging';

interface ThreadEntitiesBadgesProps {
  entities?: SmartThreadEntity[];
  threadId: string;
}

const entityIcons = {
  supply_request: Package,
  boat: Anchor,
  order: Box,
  intervention: Wrench,
  stock_item: Package,
  checklist: ClipboardCheck,
};

const entityColors = {
  supply_request: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  boat: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  order: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  intervention: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  stock_item: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  checklist: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
};

const entityLabels = {
  supply_request: 'Approvisionnement',
  boat: 'Bateau',
  order: 'Commande',
  intervention: 'Intervention',
  stock_item: 'Stock',
  checklist: 'Checklist',
};

export function ThreadEntitiesBadges({ entities, threadId }: ThreadEntitiesBadgesProps) {
  if (!entities || entities.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link className="h-3.5 w-3.5" />
        <span>Lié à :</span>
      </div>
      <TooltipProvider>
        <div className="flex gap-2 flex-wrap">
          {entities.map((entity) => {
            const Icon = entityIcons[entity.entity_type];
            const colorClass = entityColors[entity.entity_type];
            const label = entityLabels[entity.entity_type];

            const displayName = entity.entity_details?.name || label;
            
            return (
              <Tooltip key={entity.id}>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    <span>{displayName}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-semibold">{displayName}</div>
                    {entity.entity_details?.reference && (
                      <div className="text-muted-foreground">Réf: {entity.entity_details.reference}</div>
                    )}
                    {entity.notes && (
                      <div className="text-muted-foreground mt-1">{entity.notes}</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
