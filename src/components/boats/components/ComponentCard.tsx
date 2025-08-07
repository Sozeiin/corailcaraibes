import React, { useState } from 'react';
import { Edit, Trash2, Wrench, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const statusBadge = getStatusBadge(component.status);

  const handleDeleteClick = () => {
    console.log('Delete button clicked for component:', component.id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    console.log('Confirming deletion of component:', component.id);
    deleteComponentMutation.mutate(component.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="border-l-4 border-l-primary transition-all hover:shadow-md">
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
                title="Modifier le composant"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Supprimer le composant"
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
            {component.hin && (
              <div>
                <span className="font-medium">HIN:</span> {component.hin}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Êtes-vous sûr de vouloir supprimer le composant{' '}
                <span className="font-semibold">"{component.componentName}"</span> ?
              </p>
              <p className="text-sm text-muted-foreground">
                Cette action est irréversible. Toutes les données associées à ce composant seront perdues.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteComponentMutation.isPending}
            >
              {deleteComponentMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

export { ComponentCard, EmptyState };