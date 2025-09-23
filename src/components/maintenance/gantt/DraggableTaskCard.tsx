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
  activity_type?: 'maintenance' | 'preparation' | 'checkin' | 'checkout';
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

  // Use activity_type for new planning activities, fallback to intervention_type for traditional interventions
  const taskType = task.activity_type || task.intervention_type || 'default';
  const typeConfig = getTaskTypeConfig(taskType);
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
    e.preventDefault();
    e.stopPropagation();
    console.log('DraggableTaskCard context menu:', task.title);
    if (!isBeingDragged && !isDragging) {
      onContextMenu?.(e);
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
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={(e) => {
        console.log('DraggableTaskCard onContextMenu direct:', task.title);
        handleContextMenu(e);
      }}
      onMouseDown={(e) => {
        console.log('Mouse down on card:', e.button); // 0=left, 1=middle, 2=right
      }}
      className={`
        relative cursor-grab active:cursor-grabbing select-none transition-all duration-300 rounded-2xl shadow-sm
        ${isBeingDragged || isDragging ? 'opacity-50 scale-105 shadow-lg z-50' : 'hover:shadow-md hover:scale-[1.02]'}
        ${typeConfig.bg} ${typeConfig.border} border-l-4 touch-manipulation w-full h-full
      `}
    >
      <div className="p-3 space-y-2 h-full flex flex-col">
        {/* Header with status and icon */}
        <div className="flex items-center justify-between">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <IconComponent className={`h-4 w-4 ${typeConfig.text}`} />
        </div>
        
        {/* Task title */}
        <div className={`text-sm font-semibold line-clamp-2 ${typeConfig.text} flex-1`}>
          {task.title}
        </div>
        
        {/* Boat name et time dans la même ligne */}
        <div className="space-y-1">
          {task.boats && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Ship className="h-3 w-3" />
              <span className="truncate">{task.boats.name}</span>
            </div>
          )}
          
          {task.scheduled_time && (
            <div className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded-md inline-block">
              {task.scheduled_time.split(':').slice(0, 2).join(':')}
            </div>
          )}
        </div>
        
        {/* Priority indicator */}
        {task.priority && (task.priority === 'urgent' || task.priority === 'high') && (
          <div className={`w-full h-1 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'}`} />
        )}
      </div>
    </Card>
  );
}