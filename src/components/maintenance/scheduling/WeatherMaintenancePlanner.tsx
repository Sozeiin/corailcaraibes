import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, User, CloudRain, RefreshCw, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, addDays, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import WeatherWidget from '@/components/weather/WeatherWidget';
import { DroppableDay } from './DroppableDay';
import { DraggableIntervention } from './DraggableIntervention';
import { InterventionTypeLegend } from './InterventionTypeLegend';
import { useToast } from '@/hooks/use-toast';
import type { WeatherData } from '@/types/weather';

interface WeatherEvaluation {
  suitable: boolean;
  weather_data?: WeatherData;
  violated_rules?: Array<{
    rule_name: string;
    action: string;
    adjustment_days: number;
    reason: string;
  }>;
  recommendations?: Array<{
    rule_name: string;
    action: string;
    adjustment_days: number;
    reason: string;
  }>;
  reason?: string;
}

interface Intervention {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  status: string;
  intervention_type: string;
  boat: {
    name: string;
    base_id: string;
  };
  technician?: {
    name: string;
  };
}

export function WeatherMaintenancePlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedIntervention, setDraggedIntervention] = useState<Intervention | null>(null);

  // Fetch weekly schedule
  const { data: weeklySchedule = [], isLoading, refetch } = useQuery({
    queryKey: ['weather-enhanced-schedule', user?.role, user?.baseId],
    queryFn: async () => {
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          boats!inner(name, model, base_id),
          profiles(name)
        `)
        .gte('scheduled_date', startDate.toISOString().split('T')[0])
        .lte('scheduled_date', endDate.toISOString().split('T')[0])
        .order('scheduled_date');

      if (error) {
        console.error('Error fetching weekly schedule:', error);
        throw error;
      }
      
      return data.map(intervention => ({
        ...intervention,
        boat: intervention.boats,
        technician: intervention.profiles
      }));
    },
    enabled: !!user
  });

  // Fetch technician statistics
  const { data: technicianStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['technician-stats', user?.role, user?.baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          interventions!technician_id(
            id,
            status,
            scheduled_date
          )
        `)
        .eq('role', 'technicien');

      if (error) {
        console.error('Error fetching technician stats:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!user
  });

  // Fetch weather evaluations
  const { data: weatherEvaluations = {}, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather-evaluations', weeklySchedule],
    queryFn: async () => {
      const evaluations: Record<string, WeatherEvaluation> = {};
      
      for (const intervention of weeklySchedule) {
        if (intervention.scheduled_date && intervention.boat?.base_id) {
          try {
            const { data, error } = await supabase.rpc('evaluate_weather_for_maintenance', {
              maintenance_date: intervention.scheduled_date,
              base_id_param: intervention.boat.base_id
            });

            if (!error && data) {
              evaluations[intervention.id] = data as unknown as WeatherEvaluation;
            }
          } catch (err) {
            console.error('Error evaluating weather for intervention', intervention.id, err);
          }
        }
      }
      
      return evaluations;
    },
    enabled: weeklySchedule.length > 0
  });

  // Mutation to update intervention date
  const updateInterventionMutation = useMutation({
    mutationFn: async ({ interventionId, newDate }: { interventionId: string; newDate: string }) => {
      const { error } = await supabase
        .from('interventions')
        .update({ scheduled_date: newDate })
        .eq('id', interventionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather-enhanced-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['weather-evaluations'] });
      toast({
        title: "Intervention reprogrammée",
        description: "L'intervention a été déplacée avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error updating intervention:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déplacer l'intervention.",
        variant: "destructive",
      });
    }
  });

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel('interventions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['weather-enhanced-schedule'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const intervention = weeklySchedule.find(i => i.id === active.id);
    setDraggedIntervention(intervention || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active.id) {
      setActiveId(null);
      setDraggedIntervention(null);
      return;
    }

    const interventionId = active.id as string;
    const newDate = over.id as string;
    
    // Check if the date is different
    const intervention = weeklySchedule.find(i => i.id === interventionId);
    if (intervention && intervention.scheduled_date !== newDate) {
      updateInterventionMutation.mutate({ interventionId, newDate });
    }
    
    setActiveId(null);
    setDraggedIntervention(null);
  };

  // Group interventions by date
  const groupedByDate = weeklySchedule.reduce((acc, intervention) => {
    const date = intervention.scheduled_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(intervention);
    return acc;
  }, {} as Record<string, Intervention[]>);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    return {
      date,
      dateString: date.toISOString().split('T')[0],
    };
  });

  // Get day weather evaluation (aggregate from interventions)
  const getDayWeatherEvaluation = (dateString: string) => {
    const dayInterventions = groupedByDate[dateString] || [];
    if (dayInterventions.length === 0) return undefined;
    
    // Return the most severe weather evaluation for the day
    const evaluations = dayInterventions
      .map(intervention => weatherEvaluations[intervention.id])
      .filter(Boolean);
    
    if (evaluations.length === 0) return undefined;
    
    return evaluations.find(evaluation => !evaluation.suitable) || evaluations[0];
  };

  if (isLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Planning avec météo</h2>
        <p className="text-muted-foreground mt-1">
          Planification intelligente des interventions avec intégration météorologique et glisser-déposer
        </p>
      </div>

      {/* Weather Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5" />
            Conditions météorologiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeatherWidget />
        </CardContent>
      </Card>

      {/* Legend and Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Intervention Type Legend */}
        <div className="lg:col-span-1">
          <InterventionTypeLegend />
        </div>

        {/* Technician Statistics */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {technicianStats.map((tech) => {
            const activeInterventions = tech.interventions?.filter(
              (i: any) => i.status === 'in_progress'
            ).length || 0;
            const scheduledInterventions = tech.interventions?.filter(
              (i: any) => i.status === 'scheduled'
            ).length || 0;

            return (
              <Card key={tech.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {tech.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">En cours:</span>
                      <Badge variant={activeInterventions > 0 ? "default" : "secondary"}>
                        {activeInterventions}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Programmées:</span>
                      <Badge variant="outline">
                        {scheduledInterventions}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Weekly Schedule with Drag & Drop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Planning de la semaine avec glisser-déposer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const dayInterventions = groupedByDate[day.dateString] || [];
                const weatherEvaluation = getDayWeatherEvaluation(day.dateString);
                
                return (
                  <DroppableDay
                    key={day.dateString}
                    date={day.date}
                    interventions={dayInterventions}
                    weatherEvaluation={weatherEvaluation}
                  />
                );
              })}
            </div>
            
            <DragOverlay>
              {draggedIntervention ? (
                <DraggableIntervention intervention={draggedIntervention} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      {/* Weather Alerts Summary */}
      {Object.entries(weatherEvaluations).some(([_, evaluation]) => !evaluation.suitable) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Alertes météorologiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(weatherEvaluations)
                .filter(([_, evaluation]) => !evaluation.suitable)
                .map(([interventionId, evaluation]) => {
                  const intervention = weeklySchedule.find(i => i.id === interventionId);
                  if (!intervention) return null;
                  
                  return (
                    <div key={interventionId} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <div className="font-medium">{intervention.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {intervention.boat.name} - {format(new Date(intervention.scheduled_date), 'EEEE d MMMM', { locale: fr })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {evaluation.violated_rules?.map((rule) => (
                          <Button
                            key={rule.rule_name}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newDate = addDays(new Date(intervention.scheduled_date), rule.adjustment_days);
                              updateInterventionMutation.mutate({
                                interventionId: intervention.id,
                                newDate: newDate.toISOString().split('T')[0]
                              });
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reporter de {rule.adjustment_days}j
                          </Button>
                        ))}
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
}