import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Ship } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  estimated_duration?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  intervention_type?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  technician_id?: string;
  boat_id?: string;
  boats?: { id: string; name: string; model: string };
}

interface DraggableTaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
  getTaskTypeConfig: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
}

export function DraggableTaskCard({ task, onClick, isDragging = false, getTaskTypeConfig }: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isBeingDragged,
  } = useDraggable({
    id: task.id,
  });

  const typeConfig = getTaskTypeConfig(task.intervention_type || 'default');
  const IconComponent = typeConfig.icon;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getStatusColor = () => {
    switch (task.status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTime = () => {
    if (!task.scheduled_time) return '';
    const time = task.scheduled_time.split(':').slice(0, 2).join(':');
    const duration = task.estimated_duration ? ` (${task.estimated_duration}min)` : '';
    return `${time}${duration}`;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        relative cursor-pointer select-none transition-all duration-200
        ${isBeingDragged || isDragging ? 'opacity-50 scale-105 shadow-lg z-50' : 'hover:shadow-md hover:scale-[1.02]'}
        ${typeConfig.bg} ${typeConfig.border} border-l-4
      `}
      onClick={onClick}
    >
      <div className="p-2 space-y-1">
        {/* Status indicator */}
        <div className="flex items-center justify-between">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <IconComponent className={`h-3 w-3 ${typeConfig.text}`} />
        </div>
        
        {/* Task title */}
        <div className={`text-xs font-medium line-clamp-2 ${typeConfig.text}`}>
          {task.title}
        </div>
        
        {/* Boat name */}
        {task.boats && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Ship className="h-3 w-3" />
            <span className="truncate">{task.boats.name}</span>
          </div>
        )}
        
        {/* Time and duration */}
        {formatTime() && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime()}</span>
          </div>
        )}
        
        {/* Priority badge */}
        {task.priority && task.priority !== 'medium' && (
          <Badge
            variant={task.priority === 'urgent' || task.priority === 'high' ? 'destructive' : 'secondary'}
            className="text-xs px-1 py-0"
          >
            {task.priority}
          </Badge>
        )}
      </div>
    </Card>
  );
}