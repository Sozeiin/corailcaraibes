import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, startOfWeek, addHours, isToday, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Plus,
  Clock,
  User,
  Ship,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Wrench,
  Zap,
  Droplets,
  Cog,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DroppableTimeSlot } from './gantt/DroppableTimeSlot';
import { DraggableTaskCard } from './gantt/DraggableTaskCard';
import { UnassignedTasksPanel } from './gantt/UnassignedTasksPanel';
import { TaskDialog } from './gantt/TaskDialog';

interface Intervention {
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
  base_id: string;
  color_code?: string;
  technician?: { id: string; name: string };
  boats?: { id: string; name: string; model: string };
}

interface Technician {
  id: string;
  name: string;
  role: string;
}

const TASK_TYPE_COLORS = {
  oil: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', icon: Droplets },
  engine: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', icon: Cog },
  electrical: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', icon: Zap },
  mechanical: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', icon: Wrench },
  emergency: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', icon: AlertTriangle },
  default: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', icon: Wrench }
};

export function GanttMaintenanceSchedule() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<Intervention | null>(null);
  const [selectedTask, setSelectedTask] = useState<Intervention | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showUnassignedPanel, setShowUnassignedPanel] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate time slots (6 AM to 7 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 19; hour++) {
      slots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`
      });
    }
    return slots;
  }, []);

  // Generate week days
  const weekDays = useMemo(() => {
    const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
    console.log('Week start date:', startDate);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startDate, i);
      const dateString = date.toISOString().split('T')[0];
      console.log(`Day ${i}:`, date, 'dateString:', dateString);
      return {
        date,
        dateString,
        dayName: format(date, 'EEE', { locale: fr }),
        dayNumber: format(date, 'd'),
        isToday: isToday(date)
      };
    });
  }, [currentWeek]);

  // Fetch technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', user?.baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('role', 'technicien')
        .eq('base_id', user?.baseId);

      if (error) throw error;
      return data as Technician[];
    },
    enabled: !!user?.baseId
  });

  // Fetch interventions
  const { data: interventions = [], isLoading: interventionsLoading } = useQuery({
    queryKey: ['gantt-interventions', weekDays[0]?.dateString, weekDays[6]?.dateString, user?.baseId],
    queryFn: async () => {
      if (!weekDays.length) return [];
      
      console.log('Fetching interventions for date range:', weekDays[0]?.dateString, 'to', weekDays[6]?.dateString);
      
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          technician:profiles!technician_id(id, name),
          boats(id, name, model)
        `)
        .gte('scheduled_date', weekDays[0]?.dateString)
        .lte('scheduled_date', weekDays[6]?.dateString)
        .eq('base_id', user?.baseId)
        .order('scheduled_date');

      if (error) {
        console.error('Error fetching interventions:', error);
        throw error;
      }
      
      console.log('Fetched interventions:', data);
      
      return data.map(item => ({
        ...item,
        estimated_duration: 60, // Default duration
        intervention_type: item.intervention_type || 'maintenance',
        priority: 'medium' as const // Default priority
      })) as Intervention[];
    },
    enabled: !!user?.baseId && weekDays.length > 0
  });

  // Update intervention mutation
  const updateInterventionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Intervention> }) => {
      // Clean the updates object to only include valid database fields
      const cleanUpdates = {
        ...(updates.technician_id !== undefined && { technician_id: updates.technician_id }),
        ...(updates.scheduled_date && { scheduled_date: updates.scheduled_date }),
        ...(updates.scheduled_time && { scheduled_time: updates.scheduled_time }),
        ...(updates.status && { status: updates.status }),
        ...(updates.title && { title: updates.title }),
        ...(updates.description && { description: updates.description })
      };

      console.log('Updating intervention:', id, 'with:', cleanUpdates);

      const { data, error } = await supabase
        .from('interventions')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-interventions'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast({ title: "Intervention mise à jour avec succès" });
    },
    onError: (error) => {
      console.error('Error updating intervention:', error);
      toast({ 
        title: "Erreur lors de la mise à jour", 
        description: "Impossible de mettre à jour l'intervention",
        variant: "destructive" 
      });
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = interventions.find(i => i.id === event.active.id);
    setDraggedTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedTask) {
      setDraggedTask(null);
      return;
    }

    try {
      const dropId = over.id.toString();
      console.log('Drop target ID:', dropId);
      
      // Parse the drop target ID: technicianId-dateString-hour
      // The technicianId can be a UUID (with dashes) so we need to be careful
      const parts = dropId.split('-');
      
      if (parts.length < 3) {
        console.error('Invalid drop target format:', dropId);
        setDraggedTask(null);
        return;
      }
      
      // The last part is the hour, the second to last should be the day
      const hour = parseInt(parts[parts.length - 1]);
      const day = parts[parts.length - 2];
      
      // Everything except the last two parts is the technician ID
      const technicianId = parts.slice(0, -2).join('-');
      
      console.log('Parsed drop target:', { technicianId, day, hour });
      
      if (isNaN(hour) || !day || isNaN(parseInt(day))) {
        console.error('Invalid drop target data:', { technicianId, day, hour });
        setDraggedTask(null);
        return;
      }
      
      // Reconstruct the full date from the current week and day
      const currentWeekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const dayIndex = parseInt(day) - 1; // day is 1-7, we need 0-6
      const fullDate = addDays(currentWeekStart, dayIndex);
      const dateString = fullDate.toISOString().split('T')[0];
      
      // Format the time correctly for database
      const scheduledTime = `${hour.toString().padStart(2, '0')}:00:00`;
      
      console.log('Final update data:', {
        technician_id: technicianId === 'unassigned' ? null : technicianId,
        scheduled_date: dateString,
        scheduled_time: scheduledTime
      });
      
      // Update the intervention
      updateInterventionMutation.mutate({
        id: draggedTask.id,
        updates: {
          technician_id: technicianId === 'unassigned' ? null : technicianId,
          scheduled_date: dateString,
          scheduled_time: scheduledTime
        }
      });
    } catch (error) {
      console.error('Error in handleDragEnd:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de déplacer la tâche",
        variant: "destructive" 
      });
    }

    setDraggedTask(null);
  };

  const getTasksForSlot = (technicianId: string | null, dateString: string, hour: number) => {
    const tasks = interventions.filter(intervention => {
      const taskHour = intervention.scheduled_time ? 
        parseInt(intervention.scheduled_time.split(':')[0]) : 9;
      
      console.log('Filtering task:', intervention.id, {
        intervention_technician: intervention.technician_id,
        slot_technician: technicianId,
        intervention_date: intervention.scheduled_date,
        slot_date: dateString,
        intervention_hour: taskHour,
        slot_hour: hour
      });
      
      return intervention.technician_id === technicianId &&
             intervention.scheduled_date === dateString &&
             taskHour === hour;
    });
    console.log(`Tasks for slot ${technicianId}-${dateString}-${hour}:`, tasks);
    return tasks;
  };

  const getUnassignedTasks = () => {
    const unassigned = interventions.filter(intervention => !intervention.technician_id);
    console.log('Unassigned tasks:', unassigned);
    return unassigned;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addDays(prev, 7) : addDays(prev, -7));
  };

  const getTaskTypeConfig = (type: string) => {
    return TASK_TYPE_COLORS[type as keyof typeof TASK_TYPE_COLORS] || TASK_TYPE_COLORS.default;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b bg-gradient-to-r from-card to-muted/10 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Planning Maintenance
              </h1>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg border p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium px-4 py-1 min-w-[200px] text-center">
                {format(weekDays[0]?.date || new Date(), 'd MMM', { locale: fr })} - {format(weekDays[6]?.date || new Date(), 'd MMM yyyy', { locale: fr })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile panel toggle */}
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setShowUnassignedPanel(!showUnassignedPanel)}
            >
              {showUnassignedPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {/* Add task button */}
            <Button
              size="sm"
              onClick={() => setShowTaskDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle tâche
            </Button>
          </div>
        </div>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          {/* Unassigned tasks panel */}
          <UnassignedTasksPanel
            tasks={getUnassignedTasks()}
            isVisible={showUnassignedPanel}
            onTaskClick={(task) => setSelectedTask(task as Intervention)}
            getTaskTypeConfig={getTaskTypeConfig}
          />

          {/* Main Gantt area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Time header */}
            <div className="flex-none border-b bg-gradient-to-r from-muted/40 to-muted/20 shadow-sm">
              <div className="flex">
                <div className="w-48 flex-none border-r bg-muted/50 p-3 font-semibold text-foreground/80 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Techniciens
                </div>
                <ScrollArea className="flex-1">
                  <div className="flex min-w-max">
                    {weekDays.map(day => (
                      <div key={day.dateString} className="gantt-timeline">
                        <div className={`text-center p-3 gantt-header font-medium border-r border-border/30 ${day.isToday ? 'gantt-today bg-primary/5' : 'hover:bg-muted/30'} transition-colors`}>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider">{day.dayName}</div>
                          <div className={`text-lg ${day.isToday ? 'text-primary font-bold' : 'text-foreground'}`}>
                            {day.dayNumber}
                          </div>
                        </div>
                        <div className="flex">
                          {timeSlots.map(slot => (
                            <div key={slot.hour} className="gantt-time-slot border-r border-border/30">
                              <div className="text-xs text-center text-muted-foreground font-medium px-1">
                                {slot.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Technician rows */}
            <ScrollArea className="flex-1">
              <div className="min-h-full">
                {technicians.map(technician => (
                  <div key={technician.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <div className="flex">
                      {/* Technician name */}
                      <div className="w-48 flex-none border-r bg-gradient-to-r from-muted/40 to-muted/20 p-4 flex items-center gap-3">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium truncate text-foreground">{technician.name}</span>
                      </div>
                      
                      {/* Timeline */}
                      <div className="flex-1">
                        <div className="flex min-w-max">
                          {weekDays.map(day => (
                            <div key={day.dateString} className="gantt-timeline">
                              <div className="flex h-20">
                                {timeSlots.map(slot => (
                                  <DroppableTimeSlot
                                    key={`${technician.id}-${day.dayNumber}-${slot.hour}`}
                                    id={`${technician.id}-${day.dayNumber}-${slot.hour}`}
                                    tasks={getTasksForSlot(technician.id, day.dateString, slot.hour)}
                                    onTaskClick={(task) => setSelectedTask(task as Intervention)}
                                    getTaskTypeConfig={getTaskTypeConfig}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggedTask && (
            <DraggableTaskCard
              task={draggedTask}
              isDragging={true}
              getTaskTypeConfig={getTaskTypeConfig}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Dialog */}
      {(showTaskDialog || selectedTask) && (
        <TaskDialog
          task={selectedTask}
          isOpen={showTaskDialog || !!selectedTask}
          onClose={() => {
            setShowTaskDialog(false);
            setSelectedTask(null);
          }}
          technicians={technicians}
        />
      )}
    </div>
  );
}