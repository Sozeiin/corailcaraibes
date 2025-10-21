import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Ship } from 'lucide-react';

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
  activity_type?: 'maintenance' | 'preparation' | 'checkin' | 'checkout';
}

interface SimpleDraggableTaskProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
  getTaskTypeConfig?: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
}

export function SimpleDraggableTask({ 
  task, 
  onTaskClick, 
  getTaskTypeConfig 
}: SimpleDraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });

  const taskType = task.activity_type || task.intervention_type || 'default';
  const typeConfig = getTaskTypeConfig?.(taskType) || {
    bg: 'bg-gray-50',
    border: 'border-l-gray-400',
    text: 'text-gray-800',
    icon: Ship
  };
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

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      e.stopPropagation();
      onTaskClick?.(task);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`
        relative cursor-grab active:cursor-grabbing select-none transition-all duration-200
        ${isDragging ? 'opacity-50 scale-105 shadow-lg z-50' : 'hover:shadow-md hover:scale-[1.01]'}
        ${typeConfig.bg} ${typeConfig.border} border-l-4 w-full
      `}
    >
      <div className="p-1.5 space-y-1">
        {/* Header with status and icon */}
        <div className="flex items-center justify-between">
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
          <IconComponent className={`h-2.5 w-2.5 ${typeConfig.text}`} />
        </div>
        
        {/* Task title */}
        <div className={`text-[10px] font-semibold line-clamp-2 ${typeConfig.text} leading-tight`}>
          {task.title}
        </div>
        
        {/* Boat name */}
        {task.boats && (
          <div className="flex items-center gap-0.5 text-[9px] text-gray-600">
            <Ship className="h-2 w-2" />
            <span className="truncate">{task.boats.name}</span>
          </div>
        )}
        
        {/* Time */}
        {task.scheduled_time && (
          <div className="text-[9px] font-mono text-gray-600">
            {task.scheduled_time.split(':').slice(0, 2).join(':')}
          </div>
        )}
        
        {/* Priority indicator */}
        {task.priority && (task.priority === 'urgent' || task.priority === 'high') && (
          <div className={`w-full h-0.5 rounded ${task.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'}`} />
        )}
      </div>
    </Card>
  );
}