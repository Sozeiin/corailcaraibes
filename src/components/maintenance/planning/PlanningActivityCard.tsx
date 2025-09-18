import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Clock, User, AlertTriangle, CheckCircle2, Play, Pause, Ship, Calendar, LogIn, LogOut, Car, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlanningActivity {
  id: string;
  activity_type: 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency' | 'preparation';
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
  preparation_status?: 'in_progress' | 'ready' | 'anomaly';
  anomalies_count?: number;
}

interface PlanningActivityCardProps {
  activity: PlanningActivity;
  isDragging?: boolean;
  onClick?: () => void;
}

export function PlanningActivityCard({ activity, isDragging = false, onClick }: PlanningActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dndIsDragging,
  } = useDraggable({
    id: activity.id,
    data: { activity }
  });

  const isCurrentlyDragging = isDragging || dndIsDragging;

  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'checkin': return <LogIn className="w-4 h-4" />;
      case 'checkout': return <LogOut className="w-4 h-4" />;
      case 'travel': return <Car className="w-4 h-4" />;
      case 'break': return <Coffee className="w-4 h-4" />;
      case 'emergency': return <AlertTriangle className="w-4 h-4" />;
      case 'preparation': return <Ship className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    borderLeft: `3px solid ${activity.color_code}`,
    backgroundColor: isCurrentlyDragging ? '#f8fafc' : 'white',
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        cursor-grab active:cursor-grabbing border border-gray-200 rounded p-2 m-1 shadow-sm
        ${isCurrentlyDragging ? "opacity-50" : "hover:shadow-md"}
      `}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getActivityIcon()}
          <span className="font-medium text-sm truncate">{activity.title}</span>
          {activity.activity_type === 'preparation' && activity.preparation_status && (
            <span className="text-xs">
              {activity.preparation_status === 'ready' && '🟢'}
              {activity.preparation_status === 'in_progress' && '🟡'}
              {activity.preparation_status === 'anomaly' && '🔴'}
            </span>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(activity.scheduled_start), 'HH:mm')} - {format(new Date(activity.scheduled_end), 'HH:mm')}</span>
          </div>
          
          {activity.boat && (
            <div className="flex items-center gap-1">
              <span>🚤</span>
              <span className="truncate">{activity.boat.name}</span>
            </div>
          )}
          
          {activity.technician && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate">{activity.technician.name}</span>
            </div>
          )}

          {activity.activity_type === 'preparation' && activity.anomalies_count && activity.anomalies_count > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="w-3 h-3" />
              <span>{activity.anomalies_count} anomalie{activity.anomalies_count > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}