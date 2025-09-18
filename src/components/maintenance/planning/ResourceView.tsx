import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { User, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PlanningActivityCard } from './PlanningActivityCard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlanningActivity {
  id: string;
  activity_type: 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency' | 'preparation';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_duration: number;
  technician_id?: string;
  boat_id?: string;
  base_id: string;
  priority: string;
  color_code: string;
  checklist_completed: boolean;
  delay_minutes: number;
  technician?: {
    id: string;
    name: string;
  } | null;
  boat?: {
    id: string;
    name: string;
  } | null;
}

interface Technician {
  id: string;
  name: string;
  role: string;
}

interface ResourceViewProps {
  technicians: Technician[];
  activities: PlanningActivity[];
  onActivityClick: (activity: PlanningActivity) => void;
}

export function ResourceView({ technicians, activities, onActivityClick }: ResourceViewProps) {
  const getTechnicianActivities = (technicianId: string) => {
    return activities.filter(activity => activity.technician_id === technicianId);
  };

  const getTechnicianWorkload = (technicianId: string) => {
    const techActivities = getTechnicianActivities(technicianId);
    const totalDuration = techActivities.reduce((sum, activity) => sum + activity.estimated_duration, 0);
    const workingHours = 8 * 60; // 8 hours in minutes
    return Math.min((totalDuration / workingHours) * 100, 100);
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-orange-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getActivityStatusCount = (technicianId: string) => {
    const techActivities = getTechnicianActivities(technicianId);
    return {
      planned: techActivities.filter(a => a.status === 'planned').length,
      in_progress: techActivities.filter(a => a.status === 'in_progress').length,
      completed: techActivities.filter(a => a.status === 'completed').length,
      overdue: techActivities.filter(a => a.status === 'overdue').length,
    };
  };

  return (
    <div className="space-y-6">
      {/* Resource summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Techniciens actifs</p>
                <p className="text-2xl font-bold">{technicians.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Activités planifiées</p>
                <p className="text-2xl font-bold">{activities.filter(a => a.status === 'planned').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Terminées</p>
                <p className="text-2xl font-bold">{activities.filter(a => a.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold">{activities.filter(a => a.status === 'overdue').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technician resource cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {technicians.map((technician) => {
          const techActivities = getTechnicianActivities(technician.id);
          const workload = getTechnicianWorkload(technician.id);
          const statusCount = getActivityStatusCount(technician.id);
          
          return (
            <Card key={technician.id} className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {technician.name}
                  </CardTitle>
                  <Badge variant="outline">{technician.role}</Badge>
                </div>
                
                {/* Workload indicator */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Charge de travail</span>
                    <span className={`text-sm font-medium ${getWorkloadColor(workload)}`}>
                      {workload.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={workload} className="h-2" />
                </div>

                {/* Status badges */}
                <div className="flex gap-2 flex-wrap">
                  {statusCount.planned > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {statusCount.planned} planifiées
                    </Badge>
                  )}
                  {statusCount.in_progress > 0 && (
                    <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                      {statusCount.in_progress} en cours
                    </Badge>
                  )}
                  {statusCount.completed > 0 && (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      {statusCount.completed} terminées
                    </Badge>
                  )}
                  {statusCount.overdue > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {statusCount.overdue} en retard
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {techActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune activité assignée</p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {techActivities
                        .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
                        .map((activity) => (
                          <div key={activity.id} className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-sm">{activity.title}</h4>
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: activity.color_code }}
                              />
                            </div>
                            
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {format(new Date(activity.scheduled_start), 'HH:mm', { locale: fr })} - 
                                {format(new Date(activity.scheduled_end), 'HH:mm', { locale: fr })}
                                ({activity.estimated_duration} min)
                              </div>
                              
                              {activity.boat && (
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  {activity.boat.name}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                onClick={() => onActivityClick(activity)}
                              >
                                {activity.status === 'planned' && 'Planifié'}
                                {activity.status === 'in_progress' && 'En cours'}
                                {activity.status === 'completed' && 'Terminé'}
                                {activity.status === 'cancelled' && 'Annulé'}
                                {activity.status === 'overdue' && 'En retard'}
                              </Badge>
                              
                              <Badge 
                                variant="secondary" 
                                className="text-xs"
                              >
                                {activity.priority === 'low' && 'Faible'}
                                {activity.priority === 'medium' && 'Moyenne'}
                                {activity.priority === 'high' && 'Élevée'}
                                {activity.priority === 'urgent' && 'Urgente'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}