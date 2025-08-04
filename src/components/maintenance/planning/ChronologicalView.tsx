import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Ship, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday, startOfDay, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlanningActivity {
  id: string;
  activity_type: 'maintenance' | 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency';
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

interface ChronologicalViewProps {
  activities: PlanningActivity[];
  onActivityClick: (activity: PlanningActivity) => void;
}

export function ChronologicalView({ activities, onActivityClick }: ChronologicalViewProps) {
  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = startOfDay(new Date(activity.scheduled_start));
    const dateKey = date.toISOString();
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {} as Record<string, PlanningActivity[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedActivities).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Aujourd\'hui';
    if (isTomorrow(date)) return 'Demain';
    if (isYesterday(date)) return 'Hier';
    return format(date, 'EEEE dd MMMM yyyy', { locale: fr });
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      maintenance: 'Maintenance',
      checkin: 'Check-in',
      checkout: 'Check-out',
      travel: 'Déplacement',
      break: 'Pause',
      emergency: 'Urgence'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planned: 'Planifié',
      in_progress: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
      overdue: 'En retard'
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'border-l-blue-500',
      medium: 'border-l-yellow-500',
      high: 'border-l-orange-500',
      urgent: 'border-l-red-500'
    };
    return colors[priority] || 'border-l-gray-500';
  };

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucune activité planifiée</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-6 p-4">
        {sortedDates.map((dateKey) => {
          const date = new Date(dateKey);
          const dayActivities = groupedActivities[dateKey].sort((a, b) => 
            new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
          );

          return (
            <div key={dateKey}>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {getDateLabel(dateKey)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dayActivities.length} activité{dayActivities.length > 1 ? 's' : ''}
                </p>
                <Separator className="mt-2" />
              </div>

              <div className="space-y-3 mt-4">
                {dayActivities.map((activity) => (
                  <Card 
                    key={activity.id} 
                    className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${getPriorityColor(activity.priority)}`}
                    onClick={() => onActivityClick(activity)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{activity.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(activity.scheduled_start), 'HH:mm', { locale: fr })} - 
                              {format(new Date(activity.scheduled_end), 'HH:mm', { locale: fr })}
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{activity.estimated_duration} min</span>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: activity.color_code }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm">
                          {activity.technician && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{activity.technician.name}</span>
                            </div>
                          )}
                          
                          {activity.boat && (
                            <div className="flex items-center gap-1">
                              <Ship className="w-4 h-4" />
                              <span>{activity.boat.name}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getActivityTypeLabel(activity.activity_type)}
                          </Badge>
                          
                          <Badge className={`text-xs ${getStatusColor(activity.status)}`}>
                            {getStatusLabel(activity.status)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}