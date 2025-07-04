import React, { useState } from 'react';
import { BookOpen, Settings, Eye, Trash2 } from 'lucide-react';
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

interface MaintenanceManual {
  id: string;
  boatId?: string;
  boatName?: string;
  boatModel: string;
  manufacturer: string;
  tasks: {
    id: string;
    name: string;
    interval: number;
    unit: string;
    description?: string;
    lastExecution?: string | null;
  }[];
  createdAt: string;
}

interface ManualMaintenanceTableProps {
  manuals: MaintenanceManual[];
  isLoading: boolean;
  canManage: boolean;
  onManualUpdated?: () => void;
}

export function ManualMaintenanceTable({ manuals, isLoading, canManage, onManualUpdated }: ManualMaintenanceTableProps) {
  const { toast } = useToast();
  const [selectedManual, setSelectedManual] = useState<MaintenanceManual | null>(null);

  const handleCreateScheduledMaintenance = async (manual: MaintenanceManual) => {
    if (!manual.boatId) {
      toast({
        title: "Information",
        description: "Impossible de programmer automatiquement un manuel générique. Associez-le à un bateau spécifique.",
        variant: "default"
      });
      return;
    }

    try {
      // Vérifier les tâches qui n'ont pas d'intervention récente
      const tasksNeedingMaintenance = manual.tasks.filter(task => {
        if (!task.lastExecution) return true; // Jamais effectuée
        
        const lastDate = new Date(task.lastExecution);
        const now = new Date();
        const intervalMs = task.interval * 30 * 24 * 60 * 60 * 1000; // Approximation en jours
        
        return (now.getTime() - lastDate.getTime()) > intervalMs;
      });

      if (tasksNeedingMaintenance.length === 0) {
        toast({
          title: "Aucune maintenance nécessaire",
          description: "Toutes les tâches ont été effectuées récemment selon leur intervalles.",
          variant: "default"
        });
        return;
      }

      // Créer les maintenances programmées seulement pour les tâches nécessaires
      const scheduledMaintenances = tasksNeedingMaintenance.map(task => ({
        boat_id: manual.boatId,
        manual_task_id: task.id,
        task_name: task.name,
        scheduled_date: new Date(Date.now() + (task.interval * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      }));

      const { error } = await supabase
        .from('scheduled_maintenance')
        .insert(scheduledMaintenances);

      if (error) throw error;

      toast({
        title: "Maintenances programmées",
        description: `${tasksNeedingMaintenance.length} tâches de maintenance ont été programmées (${manual.tasks.length - tasksNeedingMaintenance.length} étaient à jour).`
      });

      onManualUpdated?.();
    } catch (error) {
      console.error('Error creating scheduled maintenance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de programmer les maintenances.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteManual = async (manual: MaintenanceManual) => {
    try {
      const { error } = await supabase
        .from('maintenance_manuals')
        .delete()
        .eq('id', manual.id);

      if (error) throw error;

      toast({
        title: "Manuel supprimé",
        description: "Le manuel de maintenance a été supprimé."
      });

      onManualUpdated?.();
    } catch (error) {
      console.error('Error deleting manual:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le manuel.",
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

  if (manuals.length === 0) {
    return (
      <div className="p-8 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun manuel</h3>
        <p className="text-gray-500">Commencez par ajouter les manuels constructeur.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Modèle</TableHead>
            <TableHead>Constructeur</TableHead>
            <TableHead>Tâches de maintenance</TableHead>
            <TableHead>Bateaux concernés</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {manuals.map((manual) => (
            <TableRow key={manual.id}>
              <TableCell className="font-medium">
                {manual.boatModel}
              </TableCell>
              <TableCell>
                {manual.manufacturer}
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  {manual.tasks.slice(0, 3).map((task, index) => (
                    <div key={index} className="space-y-1">
                      <Badge variant="outline" className="mr-1">
                        {task.name} ({task.interval} {task.unit})
                      </Badge>
                      {task.lastExecution && (
                        <div className="text-xs text-gray-500">
                          Dernière fois: {new Date(task.lastExecution).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                      {!task.lastExecution && (
                        <div className="text-xs text-orange-600">
                          Jamais effectuée
                        </div>
                      )}
                    </div>
                  ))}
                  {manual.tasks.length > 3 && (
                    <Badge variant="secondary">
                      +{manual.tasks.length - 3} autres
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {manual.boatName ? (
                  <div>
                    <div className="font-medium">{manual.boatName}</div>
                    <div className="text-sm text-gray-500">Spécifique</div>
                  </div>
                ) : (
                  <Badge variant="secondary">
                    Manuel générique
                  </Badge>
                )}
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCreateScheduledMaintenance(manual)}
                      title="Programmer les maintenances"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteManual(manual)}
                      className="text-red-600 hover:text-red-700"
                      title="Supprimer le manuel"
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