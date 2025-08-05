import React from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComponentFilters } from './ComponentFilters';
import { ComponentCard, EmptyState } from './ComponentCard';
import { useBoatComponents } from './BoatComponentsContext';

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

  if (components.length === 0) {
    return <EmptyState onAddNew={onAddNew} />;
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
            onClick={() => setFilters({ search: '', status: '', componentType: '', sortBy: 'name' })}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredComponents.map((component) => (
            <ComponentCard key={component.id} component={component} />
          ))}
        </div>
      )}
    </div>
  );
}