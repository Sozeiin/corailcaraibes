import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTaskCard } from './DraggableTaskCard';

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

interface DroppableTimeSlotProps {
  id: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  getTaskTypeConfig: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
}

export function DroppableTimeSlot({ id, tasks, onTaskClick, getTaskTypeConfig }: DroppableTimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] p-1 relative transition-all duration-200 ${
        isOver ? 'bg-primary/10 border-primary/30 shadow-inner' : 'hover:bg-muted/20'
      }`}
    >
      <div className="space-y-1">
        {tasks.map(task => {
          const config = getTaskTypeConfig(task.intervention_type || 'default');
          return (
            <div
              key={task.id}
              className={`text-xs p-2 rounded cursor-pointer transition-colors border-l-2 ${config.bg} ${config.border} ${config.text} hover:opacity-80`}
              onClick={() => onTaskClick(task)}
              title={`${task.title} - ${task.boats?.name || 'N/A'}`}
            >
              <div className="font-medium truncate">{task.title}</div>
              {task.boats?.name && (
                <div className="text-muted-foreground/70 truncate text-[10px]">{task.boats.name}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}