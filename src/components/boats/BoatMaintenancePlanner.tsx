import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Wrench, 
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BoatMaintenancePlannerProps {
  boatId: string;
  boatName: string;
}

export const BoatMaintenancePlanner = ({ boatId, boatName }: BoatMaintenancePlannerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scheduledMaintenance, isLoading } = useQuery({
    queryKey: ['scheduled-maintenance', boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_maintenance')
        .select(`
          *,
          maintenance_manual_tasks(
            task_name,
            description,
            interval_value,
            interval_unit
          )
        `)
        .eq('boat_id', boatId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: components } = useQuery({
    queryKey: ['boat-components-maintenance', boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_components')
        .select('*')
        .eq('boat_id', boatId)
        .order('next_maintenance_date', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const createInterventionMutation = useMutation({
    mutationFn: async (maintenanceId: string) => {
      const maintenance = scheduledMaintenance?.find(m => m.id === maintenanceId);
      if (!maintenance) throw new Error('Maintenance not found');

      const { data, error } = await supabase
        .from('interventions')
        .insert({
          boat_id: boatId,
          title: maintenance.task_name,
          description: `Maintenance programmée: ${maintenance.task_name}`,
          scheduled_date: maintenance.scheduled_date,
          status: 'scheduled',
          intervention_type: 'maintenance'
        })
        .select()
        .single();

      if (error) throw error;

      // Update scheduled maintenance to link it to the intervention
      await supabase
        .from('scheduled_maintenance')
        .update({ 
          intervention_id: data.id,
          status: 'planned'
        })
        .eq('id', maintenanceId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance', boatId] });
      toast({
        title: "Intervention créée",
        description: "L'intervention de maintenance a été programmée avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'intervention.",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status: string, scheduledDate: string) => {
    const date = new Date(scheduledDate);
    const now = new Date();
    const isOverdue = date < now && status === 'pending';

    if (isOverdue) {
      return <Badge className="bg-red-100 text-red-800">En retard</Badge>;
    }

    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'planned':
        return <Badge className="bg-blue-100 text-blue-800">Planifiée</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Terminée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMaintenanceIcon = (status: string, scheduledDate: string) => {
    const date = new Date(scheduledDate);
    const now = new Date();
    const isOverdue = date < now && status === 'pending';

    if (isOverdue) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }

    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'planned':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Wrench className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return <div>Chargement du planificateur...</div>;
  }

  const now = new Date();
  const upcomingMaintenance = scheduledMaintenance?.filter(m => 
    new Date(m.scheduled_date) >= now || m.status === 'pending'
  ) || [];
  
  const overdueMaintenance = scheduledMaintenance?.filter(m => 
    new Date(m.scheduled_date) < now && m.status === 'pending'
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Planificateur de maintenance</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {scheduledMaintenance?.length || 0} tâches programmées
          </Badge>
        </div>
      </div>

      {/* Overdue Maintenance Alert */}
      {overdueMaintenance.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Maintenance en retard ({overdueMaintenance.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueMaintenance.map((maintenance) => (
                <div key={maintenance.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="font-medium">{maintenance.task_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Prévue le {new Date(maintenance.scheduled_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => createInterventionMutation.mutate(maintenance.id)}
                    disabled={createInterventionMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Planifier maintenant
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Maintenance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              Maintenance programmée
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMaintenance.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune maintenance programmée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMaintenance.slice(0, 5).map((maintenance) => (
                  <div key={maintenance.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      {getMaintenanceIcon(maintenance.status, maintenance.scheduled_date)}
                      <div>
                        <p className="font-medium">{maintenance.task_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(maintenance.scheduled_date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(maintenance.status, maintenance.scheduled_date)}
                      {maintenance.status === 'pending' && !maintenance.intervention_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => createInterventionMutation.mutate(maintenance.id)}
                          disabled={createInterventionMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Component Maintenance Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Calendrier de maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={fr}
              className="rounded-md border"
              modifiers={{
                maintenance: scheduledMaintenance?.map(m => new Date(m.scheduled_date)) || [],
                overdue: overdueMaintenance.map(m => new Date(m.scheduled_date))
              }}
              modifiersStyles={{
                maintenance: { backgroundColor: '#3b82f6', color: 'white' },
                overdue: { backgroundColor: '#ef4444', color: 'white' }
              }}
            />
            
            {selectedDate && (
              <div className="mt-4 p-3 border rounded">
                <p className="font-medium mb-2">
                  {format(selectedDate, 'PPP', { locale: fr })}
                </p>
                {scheduledMaintenance
                  ?.filter(m => 
                    new Date(m.scheduled_date).toDateString() === selectedDate.toDateString()
                  )
                  .map(maintenance => (
                    <div key={maintenance.id} className="text-sm">
                      <p className="font-medium">{maintenance.task_name}</p>
                      {getStatusBadge(maintenance.status, maintenance.scheduled_date)}
                    </div>
                  )) || <p className="text-sm text-muted-foreground">Aucune maintenance prévue</p>
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Component Maintenance Status */}
      {components && components.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>État de maintenance des composants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {components.map((component) => {
                const nextMaintenance = component.next_maintenance_date ? new Date(component.next_maintenance_date) : null;
                const isOverdue = nextMaintenance && nextMaintenance < now;
                const isUpcoming = nextMaintenance && nextMaintenance <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <div key={component.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <div className={`h-3 w-3 rounded-full ${
                        isOverdue ? 'bg-red-500' : 
                        isUpcoming ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium">{component.component_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {component.component_type} • {component.manufacturer}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {nextMaintenance ? (
                        <>
                          <p className="text-sm font-medium">
                            {nextMaintenance.toLocaleDateString()}
                          </p>
                          <Badge variant={isOverdue ? "destructive" : isUpcoming ? "default" : "outline"}>
                            {isOverdue ? 'En retard' : isUpcoming ? 'Bientôt' : 'OK'}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline">Non définie</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};