import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface BoatOption {
  id: string;
  name: string;
}

interface UnassignedTasksDropZoneProps {
  filteredTasks: Task[];
  selectedBoatId: string;
  setSelectedBoatId: (id: string) => void;
  boatOptions: BoatOption[];
  onTaskClick: (task: Task) => void;
  getTaskTypeConfig: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
}

export function UnassignedTasksDropZone({
  filteredTasks,
  selectedBoatId,
  setSelectedBoatId,
  boatOptions,
  onTaskClick,
  getTaskTypeConfig,
}: UnassignedTasksDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-zone'
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-none border-b bg-gray-50 max-h-64 rounded-t-2xl m-4 mb-0 shadow-md transition-all ${
        isOver 
          ? 'bg-blue-100 border-4 border-blue-500 border-dashed shadow-lg scale-[1.02]' 
          : ''
      }`}
    >
      <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-gray-50 rounded-t-2xl">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-600" />
            Tâches non assignées ({filteredTasks.length})
            {isOver && <span className="text-blue-600 animate-pulse ml-2">← Déposer ici</span>}
          </h3>
          
          {boatOptions.length > 0 && (
            <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
              <SelectTrigger className="w-48 h-8 bg-white border-gray-300">
                <SelectValue placeholder="Tous les bateaux" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les bateaux</SelectItem>
                {boatOptions.map(boat => (
                  <SelectItem key={boat.id} value={boat.id}>
                    {boat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <div className="max-h-48 p-3 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-2">
          {filteredTasks.map((task, index) => (
            <div key={`unassigned-${task.id}-${index}`} className="w-40 flex-none">
              <SimpleDraggableTask 
                task={task} 
                onTaskClick={() => onTaskClick(task)} 
                getTaskTypeConfig={getTaskTypeConfig} 
              />
            </div>
          ))}
          {filteredTasks.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4 w-full">
              {selectedBoatId === 'all' ? 'Aucune tâche non assignée' : 'Aucune tâche non assignée pour ce bateau'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
