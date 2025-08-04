import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlanningActivity {
  id: string;
  activity_type: 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency';
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

interface MonthlyViewProps {
  activities: PlanningActivity[];
  onActivityClick: (activity: PlanningActivity) => void;
}

export function MonthlyView({ activities, onActivityClick }: MonthlyViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getActivitiesForDay = (day: Date) => {
    return activities.filter(activity =>
      isSameDay(new Date(activity.scheduled_start), day)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day) => (
              <div key={day} className="p-4 text-center font-medium bg-muted text-muted-foreground border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, dayIndex) => {
              const dayActivities = getActivitiesForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);

              return (
                <div 
                  key={dayIndex} 
                  className={`
                    min-h-[120px] p-2 border-r border-b last:border-r-0
                    ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
                    ${isDayToday ? 'bg-primary/5 border-primary/20' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-2 
                    ${isDayToday ? 'text-primary font-bold' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>

                  <ScrollArea className="h-20">
                    <div className="space-y-1">
                      {dayActivities.slice(0, 3).map((activity) => (
                        <div
                          key={activity.id}
                          className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate"
                          style={{ backgroundColor: `${activity.color_code}20`, borderLeft: `3px solid ${activity.color_code}` }}
                          onClick={() => onActivityClick(activity)}
                          title={`${activity.title} - ${format(new Date(activity.scheduled_start), 'HH:mm', { locale: fr })}`}
                        >
                          <div className="font-medium truncate">{activity.title}</div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-2 h-2" />
                            {format(new Date(activity.scheduled_start), 'HH:mm', { locale: fr })}
                          </div>
                        </div>
                      ))}
                      
                      {dayActivities.length > 3 && (
                        <div className="text-xs text-muted-foreground p-1">
                          +{dayActivities.length - 3} autres
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {activities.filter(a => a.status === 'planned').length}
              </p>
              <p className="text-sm text-muted-foreground">Planifiées</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {activities.filter(a => a.status === 'in_progress').length}
              </p>
              <p className="text-sm text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {activities.filter(a => a.status === 'completed').length}
              </p>
              <p className="text-sm text-muted-foreground">Terminées</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {activities.filter(a => a.status === 'overdue').length}
              </p>
              <p className="text-sm text-muted-foreground">En retard</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}