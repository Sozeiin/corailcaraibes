import React, { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, AlertTriangle, Clock } from 'lucide-react';
import { PlanningActivityCard } from './PlanningActivityCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PlanningActivity {
  id: string;
  activity_type: 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency' | 'preparation';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  title: string;
  description?: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_duration: number;
  color_code: string;
  priority: string;
  checklist_completed: boolean;
  delay_minutes: number;
  boat?: {
    id: string;
    name: string;
  };
  preparation_status?: 'in_progress' | 'ready' | 'anomaly';
  anomalies_count?: number;
}

interface DraggableActivityProps {
  activity: PlanningActivity;
}

function DraggableActivity({ activity }: DraggableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: activity.id,
    data: { activity }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <PlanningActivityCard activity={activity} isDragging={isDragging} />
    </div>
  );
}

interface UnassignedTasksSidebarProps {
  activities: PlanningActivity[];
  onClose: () => void;
  onCreateActivity: () => void;
  onCreateMaintenance: () => void;
}

export function UnassignedTasksSidebar({
  activities,
  onClose,
  onCreateActivity,
  onCreateMaintenance
}: UnassignedTasksSidebarProps) {
  const [selectedBoatId, setSelectedBoatId] = useState<string>('all');

  const boatOptions = useMemo(() => {
    const boats = new Map<string, string>();
    activities.forEach(activity => {
      if (activity.boat?.id && activity.boat?.name) {
        boats.set(activity.boat.id, activity.boat.name);
      }
    });

    return Array.from(boats.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (selectedBoatId === 'all') {
      return activities;
    }

    return activities.filter(activity => activity.boat?.id === selectedBoatId);
  }, [activities, selectedBoatId]);

  const urgentActivities = filteredActivities.filter(
    activity => activity.priority === 'high' || activity.activity_type === 'emergency'
  );
  const regularActivities = filteredActivities.filter(
    activity => activity.priority !== 'high' && activity.activity_type !== 'emergency'
  );

  return (
    <Card className="w-80 rounded-none border-r border-t-0 border-b-0 border-l-0 h-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tâches non assignées</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          <Button onClick={onCreateActivity} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle activité
          </Button>
          <Button onClick={onCreateMaintenance} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle maintenance
          </Button>
          <div className="pt-1">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
              Filtrer par bateau
            </p>
            <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
              <SelectTrigger className="w-full border-muted bg-muted/20 hover:bg-muted/40">
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
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="p-4 space-y-4">
            {/* Urgent activities */}
            {urgentActivities.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="font-medium text-red-700">Urgent ({urgentActivities.length})</h3>
                </div>
                <div className="space-y-2">
                  {urgentActivities.map(activity => (
                    <DraggableActivity key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular activities */}
            {regularActivities.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <h3 className="font-medium text-blue-700">En attente ({regularActivities.length})</h3>
                </div>
                <div className="space-y-2">
                  {regularActivities.map(activity => (
                    <DraggableActivity key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            )}

            {filteredActivities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune tâche non assignée</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}