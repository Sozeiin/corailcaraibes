import React from 'react';
import { Edit, Trash2, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBoatComponents } from './BoatComponentsContext';
import type { BoatComponent } from '@/types';

const statusOptions = [
  { value: 'operational', label: 'Opérationnel', color: 'bg-green-100 text-green-800' },
  { value: 'maintenance_needed', label: 'Maintenance requise', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'out_of_service', label: 'Hors service', color: 'bg-red-100 text-red-800' },
  { value: 'scheduled_maintenance', label: 'Maintenance planifiée', color: 'bg-blue-100 text-blue-800' }
];

const getStatusBadge = (status: string) => {
  const statusOption = statusOptions.find(opt => opt.value === status);
  return statusOption ? statusOption : statusOptions[0];
};

interface ComponentCardProps {
  component: BoatComponent;
}

function ComponentCard({ component }: ComponentCardProps) {
  const { handleEdit, deleteComponentMutation } = useBoatComponents();
  const statusBadge = getStatusBadge(component.status);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div>
              <h4 className="font-medium text-lg">{component.componentName}</h4>
              <p className="text-sm text-muted-foreground">{component.componentType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusBadge.color}>
              {statusBadge.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(component)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteComponentMutation.mutate(component.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {component.manufacturer && (
            <div>
              <span className="font-medium">Fabricant:</span> {component.manufacturer}
            </div>
          )}
          {component.model && (
            <div>
              <span className="font-medium">Modèle:</span> {component.model}
            </div>
          )}
          {component.serialNumber && (
            <div>
              <span className="font-medium">N° série:</span> {component.serialNumber}
            </div>
          )}
          <div>
            <span className="font-medium">Maintenance:</span> tous les {component.maintenanceIntervalDays} jours
          </div>
        </div>
        
        {component.notes && (
          <div className="mt-3 text-sm">
            <span className="font-medium">Notes:</span> {component.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  onAddNew: () => void;
}

function EmptyState({ onAddNew }: EmptyStateProps) {
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

interface ComponentsListProps {
  onAddNew: () => void;
}

export function ComponentsList({ onAddNew }: ComponentsListProps) {
  const { components } = useBoatComponents();

  if (components.length === 0) {
    return <EmptyState onAddNew={onAddNew} />;
  }

  return (
    <div className="grid gap-4">
      {components.map((component) => (
        <ComponentCard key={component.id} component={component} />
      ))}
    </div>
  );
}