import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
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

export function PlanningActivityCard({ activity, isDragging = false, onClick }: PlanningActivityCardProps) {
  const ActivityIcon = getActivityIcon(activity.activity_type);
  
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

  const cardStyle = {
    borderLeftColor: activity.color_code,
    backgroundColor: isCurrentlyDragging ? '#f8fafc' : 'white',
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {})
  };
  
  return (
    <Card
      ref={setNodeRef}
      style={cardStyle}
      {...listeners}
      {...attributes}
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-sm border-l-2 
        ${isCurrentlyDragging ? "opacity-50 scale-105 shadow-lg" : ""}
      `}
      onClick={onClick}
    >
      <CardContent className="p-1">
        {/* Titre avec icône - très petit */}
        <div className="flex items-center gap-1 mb-0.5">
          <ActivityIcon className="w-2 h-2 flex-shrink-0" style={{ color: activity.color_code }} />
          <span className="text-[8px] font-medium truncate leading-none">{activity.title}</span>
        </div>
        
        {/* Bateau si présent */}
        {activity.boat && (
          <div className="text-[7px] text-muted-foreground truncate leading-none mb-0.5">
            🚤 {activity.boat.name}
          </div>
        )}
        
        {/* Heures */}
        <div className="text-[7px] text-muted-foreground leading-none mb-0.5">
          ⏰ {format(new Date(activity.scheduled_start), "HH:mm", { locale: fr })} - {format(new Date(activity.scheduled_end), "HH:mm", { locale: fr })}
        </div>
        
        {/* Technicien si présent */}
        {activity.technician && (
          <div className="text-[7px] text-muted-foreground truncate leading-none">
            👤 {activity.technician.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
}