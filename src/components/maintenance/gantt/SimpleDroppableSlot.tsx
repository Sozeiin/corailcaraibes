import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SimpleDraggableTask } from './SimpleDraggableTask';
import { InterventionContextMenu } from './InterventionContextMenu';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface Technician {
  id: string;
  name: string;
  role: string;
}

interface SimpleDroppableSlotProps {
  id: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  getTaskTypeConfig?: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
  technicians?: Technician[];
  onViewDetails?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onStatusChange?: (task: Task, status: string) => void;
  onReassign?: (task: Task, technicianId: string) => void;
  onDelete?: (task: Task) => void;
  onWeatherEvaluation?: (task: Task) => void;
}

export function SimpleDroppableSlot({ 
  id, 
  tasks, 
  onTaskClick, 
  getTaskTypeConfig,
  technicians = [],
  onViewDetails,
  onEdit,
  onStatusChange,
  onReassign,
  onDelete,
  onWeatherEvaluation
}: SimpleDroppableSlotProps) {
  const isMobile = useIsMobile();
  
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: isMobile, // Disable drop on mobile
  });

  return (
    <div
      ref={isMobile ? undefined : setNodeRef}
      className={`
        min-h-[50px] p-2 transition-all duration-200 rounded-md
        ${!isMobile && isOver ? 'bg-primary/5 ring-2 ring-primary' : 'hover:bg-gray-50'}
      `}
    >
      <div className="space-y-2">
        {tasks.map(task => (
          <InterventionContextMenu
            key={task.id}
            intervention={task as any}
            technicians={technicians}
            onViewDetails={() => onViewDetails?.(task)}
            onEdit={() => onEdit?.(task)}
            onStatusChange={(status) => onStatusChange?.(task, status)}
            onReassign={(technicianId) => onReassign?.(task, technicianId)}
            onDelete={() => onDelete?.(task)}
            onWeatherEvaluation={() => onWeatherEvaluation?.(task)}
          >
            <SimpleDraggableTask
              task={task}
              onTaskClick={onTaskClick}
              getTaskTypeConfig={getTaskTypeConfig}
            />
          </InterventionContextMenu>
        ))}
      </div>
      
      {!isMobile && isOver && tasks.length === 0 && (
        <div className="border-2 border-dashed border-primary/50 rounded p-4 text-center text-sm text-muted-foreground">
          Déposer la tâche ici
        </div>
      )}
    </div>
  );
}