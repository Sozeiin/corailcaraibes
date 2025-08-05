import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComponentFilters } from './ComponentFilters';
import { AdvancedViews } from './AdvancedViews';
import { ComponentDetailsView } from './ComponentDetailsView';
import { useBoatComponents } from './BoatComponentsContext';
import type { BoatComponent } from '@/types';

interface ComponentsListProps {
  onAddNew: () => void;
}

export function ComponentsList({ onAddNew }: ComponentsListProps) {
  const { 
    components, 
    filteredComponents, 
    filters, 
    setFilters 
  } = useBoatComponents();
  
  const [selectedComponent, setSelectedComponent] = useState<BoatComponent | null>(null);

  if (selectedComponent) {
    return (
      <ComponentDetailsView 
        component={selectedComponent} 
        onClose={() => setSelectedComponent(null)} 
      />
    );
  }

  if (components.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="mb-4">Aucun composant configuré pour ce bateau</p>
        <Button onClick={onAddNew}>
          Ajouter le premier composant
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ComponentFilters 
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={components.length}
        filteredCount={filteredComponents.length}
      />
      
      {filteredComponents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun composant ne correspond aux filtres sélectionnés</p>
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={() => setFilters({ search: '', status: 'all', componentType: 'all', sortBy: 'name' })}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <AdvancedViews onAddNew={onAddNew} />
      )}
    </div>
  );
}