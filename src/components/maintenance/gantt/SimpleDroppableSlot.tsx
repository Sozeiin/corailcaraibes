import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SimpleDraggableTask } from './SimpleDraggableTask';

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

interface SimpleDroppableSlotProps {
  id: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskContextMenu?: (task: Task, e: React.MouseEvent) => void;
  getTaskTypeConfig?: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
}

export function SimpleDroppableSlot({ 
  id, 
  tasks, 
  onTaskClick, 
  onTaskContextMenu,
  getTaskTypeConfig 
}: SimpleDroppableSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[50px] p-2 transition-all duration-200 rounded-md
        ${isOver ? 'bg-primary/5 ring-2 ring-primary' : 'hover:bg-gray-50'}
      `}
    >
      <div className="space-y-2">
        {tasks.map(task => (
          <SimpleDraggableTask
            key={task.id}
            task={task}
            onTaskClick={onTaskClick}
            onTaskContextMenu={onTaskContextMenu}
            getTaskTypeConfig={getTaskTypeConfig}
          />
        ))}
      </div>
      
      {isOver && tasks.length === 0 && (
        <div className="border-2 border-dashed border-primary/50 rounded p-4 text-center text-sm text-muted-foreground">
          Déposer la tâche ici
        </div>
      )}
    </div>
  );
}