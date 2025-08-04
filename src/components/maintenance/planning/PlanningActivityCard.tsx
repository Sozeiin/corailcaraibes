import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, AlertTriangle, CheckCircle2, Play, Pause, Ship } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlanningActivity {
  id: string;
  activity_type: 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  title: string;
  description?: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_duration: number;
  actual_start?: string;
  actual_end?: string;
  actual_duration?: number;
  technician_id?: string;
  boat_id?: string;
  color_code: string;
  priority: string;
  technician?: {
    id: string;
    name: string;
  };
  boat?: {
    id: string;
    name: string;
  };
}

interface PlanningActivityCardProps {
  activity: PlanningActivity;
  isDragging?: boolean;
  onClick?: () => void;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'checkin': return CheckCircle2;
    case 'checkout': return CheckCircle2;
    case 'emergency': return AlertTriangle;
    case 'break': return Pause;
    case 'travel': return Ship;
    default: return Play;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'planned': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'in_progress': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'completed': return 'bg-green-50 text-green-700 border-green-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    case 'overdue': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'planned': return 'Planifiée';
    case 'in_progress': return 'En cours';
    case 'completed': return 'Terminée';
    case 'cancelled': return 'Annulée';
    case 'overdue': return 'En retard';
    default: return status;
  }
};

const getActivityLabel = (type: string) => {
  switch (type) {
    case 'checkin': return 'Check-in';
    case 'checkout': return 'Check-out';
    case 'travel': return 'Déplacement';
    case 'break': return 'Pause';
    case 'emergency': return 'Urgence';
    default: return type;
  }
};

export function PlanningActivityCard({ activity, isDragging = false, onClick }: PlanningActivityCardProps) {
  const ActivityIcon = getActivityIcon(activity.activity_type);
  
  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-md border-l-4
        ${isDragging ? 'opacity-50 scale-105 shadow-lg' : ''}
      `}
      style={{ 
        borderLeftColor: activity.color_code,
        backgroundColor: isDragging ? '#f8fafc' : 'white'
      }}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ActivityIcon className="w-3 h-3" style={{ color: activity.color_code }} />
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ 
                  backgroundColor: `${activity.color_code}20`,
                  borderColor: activity.color_code,
                  color: activity.color_code
                }}
              >
                {getActivityLabel(activity.activity_type)}
              </Badge>
            </div>
            <h4 className="font-medium text-sm truncate">{activity.title}</h4>
            {activity.boat && (
              <p className="text-xs text-muted-foreground">
                {activity.boat.name}
              </p>
            )}
          </div>
          <Badge variant="outline" className={`text-xs ${getStatusColor(activity.status)}`}>
            {getStatusLabel(activity.status)}
          </Badge>
        </div>

        {activity.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {activity.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {format(new Date(activity.scheduled_start), 'HH:mm', { locale: fr })} - 
              {format(new Date(activity.scheduled_end), 'HH:mm', { locale: fr })}
            </span>
          </div>
          {activity.technician && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate">{activity.technician.name}</span>
            </div>
          )}
        </div>

        {activity.priority === 'high' && (
          <div className="flex items-center gap-1 text-xs text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Priorité élevée</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}