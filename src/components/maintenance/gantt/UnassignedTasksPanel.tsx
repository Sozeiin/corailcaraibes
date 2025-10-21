import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraggableTaskCard } from './DraggableTaskCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface UnassignedTasksPanelProps {
  tasks: Task[];
  isVisible: boolean;
  onTaskClick: (task: Task) => void;
  getTaskTypeConfig: (type: string) => {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<any>;
  };
}

export function UnassignedTasksPanel({ tasks, isVisible, onTaskClick, getTaskTypeConfig }: UnassignedTasksPanelProps) {
  const [selectedBoatId, setSelectedBoatId] = useState<string>('all');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');

  const boatOptions = useMemo(() => {
    const boats = new Map<string, string>();
    tasks.forEach(task => {
      if (task.boats?.id && task.boats?.name) {
        boats.set(task.boats.id, task.boats.name);
      }
    });

    return Array.from(boats.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    if (selectedBoatId !== 'all') {
      filtered = filtered.filter(task => task.boats?.id === selectedBoatId);
    }
    
    if (selectedActivityType !== 'all') {
      filtered = filtered.filter(task => task.intervention_type === selectedActivityType);
    }
    
    return filtered;
  }, [tasks, selectedBoatId, selectedActivityType]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-64 flex-none border-r bg-muted/20 md:block">
      <Card className="h-full rounded-none border-0 shadow-none">
        <CardHeader className="pb-3 space-y-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserX className="h-4 w-4" />
            Tâches non assignées
            <Badge variant="secondary" className="ml-auto">
              {filteredTasks.length}
            </Badge>
          </CardTitle>
          
          <div className="pt-1">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
              Type d'activité
            </p>
            <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
              <SelectTrigger className="w-full border-muted bg-muted/20 hover:bg-muted/40 h-8">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="checkin">Check-in</SelectItem>
                <SelectItem value="checkout">Check-out</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="repair">Réparation</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {boatOptions.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                Filtrer par bateau
              </p>
              <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
                <SelectTrigger className="w-full border-muted bg-muted/20 hover:bg-muted/40 h-8">
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
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-3 space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune tâche non assignée</p>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    getTaskTypeConfig={getTaskTypeConfig}
                    isDragging={false}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}