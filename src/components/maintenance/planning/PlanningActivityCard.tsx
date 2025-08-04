import React from 'react';
import { useDraggable } from '@dnd-kit/core';
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
      <div className="text-sm font-medium text-gray-900 mb-1 leading-tight">
        {activity.title}
      </div>
      
      <div className="text-xs text-gray-600 space-y-0.5">
        <div>
          {format(new Date(activity.scheduled_start), "HH:mm", { locale: fr })} - {format(new Date(activity.scheduled_end), "HH:mm", { locale: fr })}
        </div>
        
        {activity.boat && (
          <div>{activity.boat.name}</div>
        )}
        
        {activity.technician && (
          <div>{activity.technician.name}</div>
        )}
      </div>
    </div>
  );
}