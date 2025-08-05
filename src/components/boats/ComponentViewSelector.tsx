import React from 'react';
import { LayoutGrid, TreePine, Map, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type ViewMode = 'grid' | 'tree' | 'schematic' | 'list';

interface ComponentViewSelectorProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  componentCount: number;
}

const viewOptions = [
  {
    id: 'schematic' as const,
    label: 'Schéma',
    icon: Map,
    description: 'Vue schématique du bateau'
  },
  {
    id: 'tree' as const,
    label: 'Arbre',
    icon: TreePine,
    description: 'Vue hiérarchique avec sous-composants'
  },
  {
    id: 'grid' as const,
    label: 'Grille',
    icon: LayoutGrid,
    description: 'Vue en cartes'
  },
  {
    id: 'list' as const,
    label: 'Liste',
    icon: List,
    description: 'Vue liste détaillée'
  }
];

export function ComponentViewSelector({ 
  currentView, 
  onViewChange, 
  componentCount 
}: ComponentViewSelectorProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-lg">Visualisation des composants</h3>
        <Badge variant="outline" className="text-xs">
          {componentCount} composant{componentCount > 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {viewOptions.map((option) => {
          const Icon = option.icon;
          const isActive = currentView === option.id;
          
          return (
            <Button
              key={option.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange(option.id)}
              className={`h-8 px-3 text-xs gap-1.5 transition-all ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-background'
              }`}
              title={option.description}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{option.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}