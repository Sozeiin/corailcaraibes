import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User, Clock, CloudRain, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import WeatherWidget from '@/components/weather/WeatherWidget';
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

export function WeatherMaintenancePlanner() {
  const { user } = useAuth();
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null);

  const { data: weeklySchedule = [], isLoading, refetch } = useQuery({
    queryKey: ['weather-enhanced-schedule', user?.role, user?.baseId],
    queryFn: async () => {
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          boats(name, model, base_id),
          profiles(name)
        `)
        .gte('scheduled_date', startDate.toISOString().split('T')[0])
        .lte('scheduled_date', endDate.toISOString().split('T')[0])
        .order('scheduled_date');

      if (error) {
        console.error('Error fetching weekly schedule:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!user
  });

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

  const { data: weatherEvaluations = {}, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather-evaluations', weeklySchedule],
    queryFn: async () => {
      const evaluations: Record<string, WeatherEvaluation> = {};
      
      for (const intervention of weeklySchedule) {
        if (intervention.scheduled_date && intervention.boats?.base_id) {
          try {
            const { data, error } = await supabase.rpc('evaluate_weather_for_maintenance', {
              maintenance_date: intervention.scheduled_date,
              base_id_param: intervention.boats.base_id
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

  const rescheduleIntervention = async (interventionId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('interventions')
        .update({ scheduled_date: newDate })
        .eq('id', interventionId);

      if (error) throw error;
      
      refetch();
      setSelectedIntervention(null);
    } catch (error) {
      console.error('Error rescheduling intervention:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programmée';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const getWeatherAlertLevel = (evaluation: WeatherEvaluation) => {
    if (!evaluation || evaluation.suitable) return null;
    
    const hasHighRisk = evaluation.violated_rules?.some(rule => 
      rule.reason.includes('wind') || rule.reason.includes('precipitation')
    );
    
    return hasHighRisk ? 'critical' : 'warning';
  };

  // Group interventions by date
  const groupedByDate = weeklySchedule.reduce((acc, intervention) => {
    const date = intervention.scheduled_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(intervention);
    return acc;
  }, {} as Record<string, any[]>);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    return {
      date,
      dateString: date.toISOString().split('T')[0],
      dayName: format(date, 'EEEE', { locale: fr }),
      dayNumber: format(date, 'd', { locale: fr })
    };
  });

  if (isLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Planning avec météo</h2>
        <p className="text-gray-600 mt-1">
          Planification des interventions intégrée aux conditions météorologiques
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

      {/* Statistiques des techniciens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <span className="text-sm text-gray-600">En cours:</span>
                    <Badge variant={activeInterventions > 0 ? "default" : "secondary"}>
                      {activeInterventions}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Programmées:</span>
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

      {/* Planning hebdomadaire avec météo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning de la semaine avec alertes météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const dayInterventions = groupedByDate[day.dateString] || [];
              
              return (
                <div key={day.dateString} className="border rounded-lg p-3">
                  <div className="text-center mb-3">
                    <div className="font-medium text-sm text-gray-900">
                      {day.dayName}
                    </div>
                    <div className="text-2xl font-bold text-marine-600">
                      {day.dayNumber}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {dayInterventions.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-2">
                        Aucune intervention
                      </div>
                    ) : (
                      dayInterventions.map((intervention) => {
                        const evaluation = weatherEvaluations[intervention.id];
                        const alertLevel = getWeatherAlertLevel(evaluation);
                        
                        return (
                          <div
                            key={intervention.id}
                            className={`relative rounded p-2 text-xs border-l-4 ${
                              alertLevel === 'critical' 
                                ? 'bg-red-50 border-l-red-500' 
                                : alertLevel === 'warning'
                                ? 'bg-yellow-50 border-l-yellow-500'
                                : 'bg-gray-50 border-l-gray-300'
                            }`}
                          >
                            <div className="font-medium truncate">
                              {intervention.title}
                            </div>
                            <div className="text-gray-600 truncate">
                              {intervention.boats?.name}
                            </div>
                            
                            <div className="mt-1 flex justify-between items-center">
                              <Badge 
                                className={`text-xs ${getStatusColor(intervention.status)}`}
                              >
                                {getStatusLabel(intervention.status)}
                              </Badge>
                              
                              {alertLevel && (
                                <AlertTriangle 
                                  className={`h-3 w-3 ${
                                    alertLevel === 'critical' ? 'text-red-500' : 'text-yellow-500'
                                  }`}
                                />
                              )}
                            </div>

                            {evaluation && !evaluation.suitable && (
                              <div className="mt-2">
                                <Alert className="py-1 px-2">
                                  <AlertDescription className="text-xs">
                                    {evaluation.violated_rules?.[0]?.reason === 'wind_too_strong' && 'Vent fort prévu'}
                                    {evaluation.violated_rules?.[0]?.reason === 'precipitation_too_high' && 'Fortes précipitations'}
                                    {evaluation.violated_rules?.[0]?.reason === 'temperature_too_low' && 'Température trop basse'}
                                    {evaluation.violated_rules?.[0]?.reason === 'temperature_too_high' && 'Température trop élevée'}
                                  </AlertDescription>
                                </Alert>
                                
                                {evaluation.violated_rules?.map((rule) => (
                                  <Button
                                    key={rule.rule_name}
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-1 text-xs h-6"
                                    onClick={() => {
                                      const newDate = addDays(new Date(intervention.scheduled_date), rule.adjustment_days);
                                      rescheduleIntervention(intervention.id, newDate.toISOString().split('T')[0]);
                                    }}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Reporter de {rule.adjustment_days}j
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}