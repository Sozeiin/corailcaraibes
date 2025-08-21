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
  onContextMenu?: (e: React.MouseEvent) => void;
  getTaskTypeConfig: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
}

export function DraggableTaskCard({ task, onClick, isDragging = false, onContextMenu, getTaskTypeConfig }: DraggableTaskCardProps) {
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

  const handleClick = (e: React.MouseEvent) => {
    // Only handle click if we're not currently being dragged
    if (!isBeingDragged && !isDragging) {
      e.stopPropagation();
      onClick?.();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    console.log('DraggableTaskCard handleContextMenu called for:', task.title, 'Button:', e.button);
    // N'empêcher l'événement de remonter que si nécessaire
    if (!isBeingDragged && !isDragging) {
      console.log('Allowing context menu for:', task.title);
      onContextMenu?.(e);
    } else {
      console.log('Blocking context menu for dragging task:', task.title);
      e.preventDefault();
      e.stopPropagation();
    }
  };

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
      {...(listeners || {})}
      {...attributes}
      onClick={handleClick}
      onContextMenu={(e) => {
        console.log('DraggableTaskCard onContextMenu direct:', task.title);
        handleContextMenu(e);
      }}
      className={`
        relative cursor-grab active:cursor-grabbing select-none transition-all duration-200
        ${isBeingDragged || isDragging ? 'opacity-50 scale-105 shadow-lg z-50' : 'hover:shadow-md hover:scale-[1.02]'}
        ${typeConfig.bg} ${typeConfig.border} border-l-4 touch-manipulation
      `}
    >
      <div className="p-1 space-y-0.5">
        {/* Header with status and icon */}
        <div className="flex items-center justify-between">
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
          <IconComponent className={`h-2.5 w-2.5 ${typeConfig.text}`} />
        </div>
        
        {/* Task title - simplified */}
        <div className={`text-[10px] font-medium line-clamp-1 ${typeConfig.text}`}>
          {task.title}
        </div>
        
        {/* Boat name - only if available, more compact */}
        {task.boats && (
          <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
            <Ship className="h-2 w-2" />
            <span className="truncate">{task.boats.name}</span>
          </div>
        )}
        
        {/* Time - compact display */}
        {task.scheduled_time && (
          <div className="text-[9px] text-muted-foreground">
            {task.scheduled_time.split(':').slice(0, 2).join(':')}
          </div>
        )}
        
        {/* Priority indicator - only for high/urgent */}
        {task.priority && (task.priority === 'urgent' || task.priority === 'high') && (
          <div className={`w-full h-0.5 rounded ${task.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'}`} />
        )}
      </div>
    </Card>
  );
}