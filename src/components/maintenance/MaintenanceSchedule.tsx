import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

export function MaintenanceSchedule() {
  const { user } = useAuth();

  const { data: weeklySchedule = [], isLoading } = useQuery({
    queryKey: ['weekly-schedule', user?.role, user?.baseId],
    queryFn: async () => {
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });

      console.log('Fetching weekly schedule for user:', { role: user?.role, baseId: user?.baseId });

      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          boats(name, model),
          profiles(name)
        `)
        .gte('scheduled_date', startDate.toISOString().split('T')[0])
        .lte('scheduled_date', endDate.toISOString().split('T')[0])
        .order('scheduled_date');

      if (error) {
        console.error('Error fetching weekly schedule:', error);
        throw error;
      }
      
      console.log('Fetched weekly schedule:', data?.length || 0);
      return data;
    },
    enabled: !!user
  });

  const { data: technicianStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['technician-stats', user?.role, user?.baseId],
    queryFn: async () => {
      console.log('Fetching technician stats for user:', { role: user?.role, baseId: user?.baseId });

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
      
      console.log('Fetched technician stats:', data?.length || 0);
      return data;
    },
    enabled: !!user
  });

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
        <h2 className="text-2xl font-bold text-gray-900">Planning des techniciens</h2>
        <p className="text-gray-600 mt-1">
          Vue hebdomadaire des interventions et charge de travail
        </p>
      </div>

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

      {/* Planning hebdomadaire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning de la semaine
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
                      dayInterventions.map((intervention) => (
                        <div
                          key={intervention.id}
                          className="bg-gray-50 rounded p-2 text-xs"
                        >
                          <div className="font-medium truncate">
                            {intervention.title}
                          </div>
                          <div className="text-gray-600 truncate">
                            {intervention.boats?.name}
                          </div>
                          <div className="mt-1">
                            <Badge 
                              className={`text-xs ${getStatusColor(intervention.status)}`}
                            >
                              {getStatusLabel(intervention.status)}
                            </Badge>
                          </div>
                        </div>
                      ))
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