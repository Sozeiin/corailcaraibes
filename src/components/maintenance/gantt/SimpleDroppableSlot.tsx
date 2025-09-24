import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SimpleDraggableTask } from './SimpleDraggableTask';

interface Task {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: string;
  intervention_type?: string;
  boats?: { id: string; name: string; model: string };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  technician_id?: string;
}

interface SimpleDroppableSlotProps {
  id: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

export function SimpleDroppableSlot({ 
  id, 
  tasks, 
  onTaskClick, 
  onTaskContextMenu 
}: SimpleDroppableSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[50px] p-2 transition-all duration-300 rounded-md ${
        isOver ? 'bg-blue-100 border-blue-300 shadow-inner border-2 border-dashed' : 'hover:bg-gray-50 border-2 border-transparent'
      }`}
    >
      <div className="space-y-2">
        {tasks.map(task => (
          <SimpleDraggableTask
            key={task.id}
            task={task}
            onClick={onTaskClick}
            onContextMenu={onTaskContextMenu}
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