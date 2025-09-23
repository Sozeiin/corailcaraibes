import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-80 flex-none border-r bg-muted/20 md:block">
      <Card className="h-full rounded-none border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserX className="h-4 w-4" />
            Tâches non assignées
            <Badge variant="secondary" className="ml-auto">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-3 space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune tâche non assignée</p>
                </div>
              ) : (
                tasks.map(task => (
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