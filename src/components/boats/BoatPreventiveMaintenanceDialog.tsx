import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Ship, 
  Wrench, 
  Calendar, 
  Clock,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Boat } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { InterventionDialog } from '@/components/maintenance/InterventionDialog';

interface BoatPreventiveMaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boat: Boat | null;
}

export function BoatPreventiveMaintenanceDialog({ isOpen, onClose, boat }: BoatPreventiveMaintenanceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInterventionDialogOpen, setIsInterventionDialogOpen] = useState(false);

  // Fetch scheduled maintenance tasks for this boat
  const { data: scheduledTasks = [] } = useQuery({
    queryKey: ['boat-scheduled-maintenance', boat?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select(`
          *,
          profiles(name)
        `)
        .eq('boat_id', boat?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!boat?.id
  });

  // Fetch upcoming interventions for this boat
  const { data: upcomingInterventions = [] } = useQuery({
    queryKey: ['boat-upcoming-interventions', boat?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          profiles(name)
        `)
        .eq('boat_id', boat?.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!boat?.id
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: 'En attente', variant: 'secondary' as const, icon: Clock },
      in_progress: { label: 'En cours', variant: 'default' as const, icon: Wrench },
      completed: { label: 'Terminée', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'Annulée', variant: 'destructive' as const, icon: AlertCircle }
    };
    
    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTaskPriorityBadge = (priority: string) => {
    const configs = {
      low: { label: 'Faible', variant: 'outline' as const },
      medium: { label: 'Moyenne', variant: 'secondary' as const },
      high: { label: 'Élevée', variant: 'default' as const },
      urgent: { label: 'Urgente', variant: 'destructive' as const }
    };
    
    const config = configs[priority as keyof typeof configs] || configs.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleCreateIntervention = () => {
    setIsInterventionDialogOpen(true);
  };

  const handleInterventionDialogClose = () => {
    setIsInterventionDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['boat-upcoming-interventions', boat?.id] });
  };

  const canManage = user?.role === 'direction' || user?.role === 'chef_base';

  if (!boat) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance préventive - {boat.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Interventions programmées
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Tâches planifiées
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Interventions à venir</h3>
                {canManage && (
                  <Button onClick={handleCreateIntervention} className="bg-marine-600 hover:bg-marine-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle intervention
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {upcomingInterventions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium mb-2">Aucune intervention programmée</h4>
                      <p className="text-gray-600 mb-4">
                        Ce bateau n'a pas d'intervention de maintenance programmée.
                      </p>
                      {canManage && (
                        <Button onClick={handleCreateIntervention} className="bg-marine-600 hover:bg-marine-700">
                          <Plus className="h-4 w-4 mr-2" />
                          Programmer une intervention
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  upcomingInterventions.map((intervention) => (
                    <Card key={intervention.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{intervention.title}</CardTitle>
                          {getStatusBadge(intervention.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {intervention.description && (
                          <p className="text-gray-600">{intervention.description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                              Programmée: {format(new Date(intervention.scheduled_date), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Technicien:</span> {intervention.profiles?.name || 'Non assigné'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Tâches de maintenance planifiées</h3>
              </div>

              <div className="space-y-4">
                {scheduledTasks.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium mb-2">Aucune tâche planifiée</h4>
                      <p className="text-gray-600">
                        Ce bateau n'a pas de tâches de maintenance automatiquement planifiées.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  scheduledTasks.map((task) => (
                    <Card key={task.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          <div className="flex gap-2">
                            {getTaskPriorityBadge(task.priority)}
                            {getStatusBadge(task.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {task.description && (
                          <p className="text-gray-600">{task.description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Durée estimée:</span> {task.estimated_duration || 'Non définie'} min
                          </div>
                          <div>
                            <span className="font-medium">Assignée à:</span> {task.profiles?.name || 'Non assigné'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                              Créée: {format(new Date(task.created_at), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </div>
                          {task.completed_at && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>
                                Terminée: {format(new Date(task.completed_at), 'dd/MM/yyyy', { locale: fr })}
                              </span>
                            </div>
                          )}
                        </div>
                        {task.notes && (
                          <div className="mt-2">
                            <span className="font-medium">Notes:</span> {task.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <InterventionDialog
        isOpen={isInterventionDialogOpen}
        onClose={handleInterventionDialogClose}
        intervention={boat ? {
          id: '',
          boatId: boat.id,
          technicianId: '',
          title: '',
          description: '',
          status: 'scheduled',
          scheduledDate: new Date().toISOString().split('T')[0],
          completedDate: '',
          tasks: [],
          baseId: user?.baseId || '',
          createdAt: new Date().toISOString()
        } : undefined}
      />
    </>
  );
}