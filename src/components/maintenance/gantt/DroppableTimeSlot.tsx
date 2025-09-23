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
  weatherEvaluation?: any;
  weatherSeverity?: string;
}

interface DroppableTimeSlotProps {
  id: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  getTaskTypeConfig?: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
  isOver?: boolean;
  weatherSeverity?: string;
  renderTaskCard?: (task: Task) => React.ReactNode;
}

export function DroppableTimeSlot({ 
  id, 
  tasks, 
  onTaskClick, 
  getTaskTypeConfig, 
  isOver: propIsOver, 
  weatherSeverity,
  renderTaskCard
}: DroppableTimeSlotProps) {
  const { isOver: dropIsOver, setNodeRef } = useDroppable({
    id,
  });

  const isOver = propIsOver || dropIsOver;

  const getWeatherSlotStyle = () => {
    if (!weatherSeverity) return '';
    switch (weatherSeverity) {
      case 'blocked': return 'bg-red-50/30';
      case 'warning': return 'bg-orange-50/30';
      default: return '';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[50px] p-2 relative transition-all duration-300 rounded-md ${getWeatherSlotStyle()} ${
        isOver ? 'bg-blue-100 border-blue-300 shadow-inner border-2 border-dashed' : 'hover:bg-gray-100 border-2 border-transparent cursor-pointer'
      }`}
    >
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="w-full">
            {renderTaskCard ? renderTaskCard(task) : (
              <DraggableTaskCard
                task={task}
                onClick={() => {
                  console.log('Task clicked:', task);
                  onTaskClick?.(task);
                }}
                getTaskTypeConfig={getTaskTypeConfig}
                isDragging={false}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}