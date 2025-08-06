import React from 'react';
import { Calendar, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ScheduledMaintenance {
  id: string;
  boatId: string;
  boatName: string;
  taskName: string;
  scheduledDate: string;
  status: string;
  intervalValue?: number;
  intervalUnit?: string;
}

interface ScheduledMaintenanceTableProps {
  maintenances: ScheduledMaintenance[];
  isLoading: boolean;
  canManage: boolean;
  onInterventionCreated?: () => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: 'En attente',
  scheduled: 'Programmée',
  completed: 'Terminée',
  cancelled: 'Annulée'
};

export function ScheduledMaintenanceTable({ maintenances, isLoading, canManage, onInterventionCreated }: ScheduledMaintenanceTableProps) {
  const { toast } = useToast();

  const createInterventionFromSchedule = async (maintenance: ScheduledMaintenance) => {
    try {
      // Récupérer les informations du bateau pour obtenir le base_id
      const { data: boat, error: boatError } = await supabase
        .from('boats')
        .select('base_id')
        .eq('id', maintenance.boatId)
        .single();

      if (boatError) throw boatError;

      // Créer l'intervention
      const { data: intervention, error: interventionError } = await supabase
        .from('interventions')
        .insert({
          title: `Maintenance préventive - ${maintenance.taskName}`,
          description: `Intervention créée automatiquement depuis la maintenance programmée pour ${maintenance.boatName}`,
          boat_id: maintenance.boatId,
          base_id: boat.base_id, // Ajout du base_id obligatoire
          scheduled_date: maintenance.scheduledDate,
          status: 'scheduled'
        })
        .select()
        .single();

      if (interventionError) throw interventionError;

      // Mettre à jour la maintenance planifiée avec l'ID de l'intervention
      const { error: updateError } = await supabase
        .from('scheduled_maintenance')
        .update({ 
          intervention_id: intervention.id,
          status: 'scheduled'
        })
        .eq('id', maintenance.id);

      if (updateError) throw updateError;

      toast({
        title: "Intervention créée",
        description: `L'intervention pour "${maintenance.taskName}" a été créée avec succès.`
      });

      onInterventionCreated?.();
    } catch (error) {
      console.error('Error creating intervention:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'intervention.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteScheduled = async (maintenance: ScheduledMaintenance) => {
    try {
      const { error } = await supabase
        .from('scheduled_maintenance')
        .delete()
        .eq('id', maintenance.id);

      if (error) throw error;

      toast({
        title: "Maintenance supprimée",
        description: "La maintenance programmée a été supprimée."
      });

      onInterventionCreated?.();
    } catch (error) {
      console.error('Error deleting scheduled maintenance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la maintenance programmée.",
        variant: "destructive"
      });
    }
  };
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
        </div>
      </div>
    );
  }

  if (maintenances.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune maintenance programmée</h3>
        <p className="text-gray-500">Les maintenances seront automatiquement programmées selon les manuels.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tâche</TableHead>
            <TableHead>Bateau</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Intervalle</TableHead>
            <TableHead>Date programmée</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {maintenances.map((maintenance) => (
            <TableRow key={maintenance.id}>
              <TableCell className="font-medium">
                {maintenance.taskName}
              </TableCell>
              <TableCell>
                <div>
                  <div>{maintenance.boatName}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[maintenance.status as keyof typeof statusColors] || statusColors.pending}>
                  {statusLabels[maintenance.status as keyof typeof statusLabels] || maintenance.status}
                </Badge>
              </TableCell>
              <TableCell>
                {maintenance.intervalValue && maintenance.intervalUnit && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Tous les {maintenance.intervalValue} {maintenance.intervalUnit}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {new Date(maintenance.scheduledDate).toLocaleDateString('fr-FR')}
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-marine-600 text-white hover:bg-marine-700"
                      onClick={() => createInterventionFromSchedule(maintenance)}
                    >
                      Créer intervention
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteScheduled(maintenance)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Supprimer la maintenance programmée"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}