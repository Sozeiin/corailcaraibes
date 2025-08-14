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
  const [collapsedTechnicians, setCollapsedTechnicians] = useState<Set<string>>(new Set());
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
      const dateString = format(date, 'yyyy-MM-dd'); // Use consistent date formatting
      console.log(`Day ${i}:`, date, 'dateString:', dateString);
      return {
        date,
        dateString,
        dayName: format(date, 'EEE', { locale: fr }),
        dayNumber: format(date, 'd'),
        dayIndex: i, // Add day index for easier drop target parsing
        isToday: isToday(date)
      };
    });
  }, [currentWeek]);

  // Fetch technicians - temporarily fetch all to debug
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', user?.baseId],
    queryFn: async () => {
      console.log('Fetching technicians for base_id:', user?.baseId);
      console.log('Current user data:', user);
      
      // First, let's see all technicians in the database
      const { data: allTechnicians, error: allError } = await supabase
        .from('profiles')
        .select('id, name, role, base_id')
        .eq('role', 'technicien');
      
      console.log('All technicians in database:', allTechnicians);
      
      // Then fetch for current base_id
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, base_id')
        .eq('role', 'technicien')
        .eq('base_id', user?.baseId);

      if (error) {
        console.error('Error fetching technicians:', error);
        throw error;
      }
      console.log('Technicians for current base_id:', data);
      
      // For now, return all technicians to see them all
      return allTechnicians as Technician[];
    },
    enabled: !!user?.baseId
  });

  // Fetch interventions
  const { data: interventions = [], isLoading: interventionsLoading, error: interventionsError } = useQuery({
    queryKey: ['gantt-interventions', weekDays[0]?.dateString, weekDays[6]?.dateString, user?.baseId],
    queryFn: async () => {
      if (!user) {
        console.log('No user available');
        return [];
      }
      
      console.log('Fetching interventions for date range:', weekDays[0]?.dateString, 'to', weekDays[6]?.dateString);
      console.log('User:', { id: user.id, baseId: user.baseId, role: user.role });
      
      // Fetch interventions in the current week
      const weekInterventionsPromise = supabase
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

      // Fetch all unassigned interventions (for tasks panel)
      const unassignedInterventionsPromise = supabase
        .from('interventions')
        .select(`
          *,
          technician:profiles!technician_id(id, name),
          boats(id, name, model)
        `)
        .is('technician_id', null)
        .eq('base_id', user?.baseId)
        .order('scheduled_date');

      const [weekResult, unassignedResult] = await Promise.all([
        weekInterventionsPromise,
        unassignedInterventionsPromise
      ]);

      if (weekResult.error) {
        console.error('Error fetching week interventions:', weekResult.error);
        throw weekResult.error;
      }

      if (unassignedResult.error) {
        console.error('Error fetching unassigned interventions:', unassignedResult.error);
        throw unassignedResult.error;
      }

      // Combine results, avoiding duplicates
      const weekInterventions = weekResult.data || [];
      const unassignedInterventions = unassignedResult.data || [];
      
      const allInterventions = [...weekInterventions];
      
      // Add unassigned interventions that are not already in the week view
      unassignedInterventions.forEach(intervention => {
        if (!weekInterventions.find(wi => wi.id === intervention.id)) {
          allInterventions.push(intervention);
        }
      });

      const data = allInterventions;
      
      console.log('Fetched interventions raw:', data);
      
      const processedData = data.map(item => ({
        ...item,
        estimated_duration: 60, // Default duration
        intervention_type: item.intervention_type || 'maintenance',
        priority: 'medium' as const // Default priority
      })) as Intervention[];
      
      console.log('Processed interventions:', processedData);
      return processedData;
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
    console.log('Drag started with task ID:', event.active.id);
    const task = interventions.find(i => i.id === event.active.id);
    console.log('Found task:', task);
    setDraggedTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag ended:', { activeId: active.id, overId: over?.id });
    
    if (!over || !draggedTask) {
      console.log('No valid drop target or dragged task');
      setDraggedTask(null);
      return;
    }

    try {
      const dropId = over.id.toString();
      console.log('Drop target ID:', dropId);
      
      // New drop target format: technicianId|dayIndex|hour
      // Using pipe separator to avoid UUID parsing issues
      const parts = dropId.split('|');
      
      if (parts.length !== 3) {
        console.error('Invalid drop target format:', dropId, 'expected format: technicianId|dayIndex|hour');
        setDraggedTask(null);
        return;
      }
      
      const [technicianId, dayIndexStr, hourStr] = parts;
      const dayIndex = parseInt(dayIndexStr);
      const hour = parseInt(hourStr);
      
      console.log('Parsed drop target:', { technicianId, dayIndex, hour });
      
      if (isNaN(hour) || isNaN(dayIndex) || dayIndex < 0 || dayIndex > 6) {
        console.error('Invalid drop target data:', { technicianId, dayIndex, hour });
        setDraggedTask(null);
        return;
      }
      
      // Get the date string directly from weekDays array
      const targetDay = weekDays[dayIndex];
      if (!targetDay) {
        console.error('Invalid day index:', dayIndex);
        setDraggedTask(null);
        return;
      }
      
      const dateString = targetDay.dateString;
      
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
    console.log('Getting tasks for slot:', { technicianId, dateString, hour });
    console.log('Available interventions:', interventions.length);
    
    const tasks = interventions.filter(intervention => {
      // Parse the scheduled time correctly
      const taskHour = intervention.scheduled_time ? 
        parseInt(intervention.scheduled_time.split(':')[0]) : 9;
      
      // Compare technician IDs (handle null cases)
      const technicianMatch = intervention.technician_id === technicianId;
      
      // Compare dates using consistent format
      const dateMatch = intervention.scheduled_date === dateString;
      
      // Compare hours
      const hourMatch = taskHour === hour;
      
      console.log('Filtering task:', intervention.id, {
        intervention_technician: intervention.technician_id,
        slot_technician: technicianId,
        technicianMatch,
        intervention_date: intervention.scheduled_date,
        slot_date: dateString,
        dateMatch,
        intervention_hour: taskHour,
        slot_hour: hour,
        hourMatch,
        included: technicianMatch && dateMatch && hourMatch
      });
      
      return technicianMatch && dateMatch && hourMatch;
    });
    
    console.log(`Tasks for slot ${technicianId}|${dateString}|${hour}:`, tasks.map(t => ({ id: t.id, title: t.title })));
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

  const toggleTechnicianCollapse = (technicianId: string) => {
    setCollapsedTechnicians(prev => {
      const newSet = new Set(prev);
      if (newSet.has(technicianId)) {
        newSet.delete(technicianId);
      } else {
        newSet.add(technicianId);
      }
      return newSet;
    });
  };

  const getTaskTypeConfig = (type: string) => {
    return TASK_TYPE_COLORS[type as keyof typeof TASK_TYPE_COLORS] || TASK_TYPE_COLORS.default;
  };

  const getTechnicianTaskCount = (technicianId: string) => {
    return interventions.filter(intervention => intervention.technician_id === technicianId).length;
  };

  console.log('Render - Interventions:', interventions);
  console.log('Render - User:', user);
  console.log('Render - Loading:', interventionsLoading);
  console.log('Render - Error:', interventionsError);

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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Unassigned tasks panel - moved to top */}
          {showUnassignedPanel && (
            <div className="flex-none border-b bg-muted/30 max-h-40">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tâches non assignées ({getUnassignedTasks().length})
                </h3>
              </div>
              <ScrollArea className="max-h-32 p-2">
                <div className="flex flex-wrap gap-2">
                  {getUnassignedTasks().map(task => (
                    <div key={task.id} className="w-48">
                      <DraggableTaskCard
                        task={task}
                        onClick={() => setSelectedTask(task)}
                        getTaskTypeConfig={getTaskTypeConfig}
                        isDragging={false}
                      />
                    </div>
                  ))}
                  {getUnassignedTasks().length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 w-full">
                      Aucune tâche non assignée
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Main table */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Table header */}
            <div className="flex-none border-b bg-gradient-to-r from-muted/40 to-muted/20 shadow-sm">
              <div className="flex">
                {/* Technician column header */}
                <div className="w-40 flex-none border-r bg-muted/50 p-3 font-semibold text-foreground/80 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Technicien
                </div>
                {/* Hour column header */}
                <div className="w-20 flex-none border-r bg-muted/50 p-3 font-semibold text-foreground/80 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Heure
                </div>
                {/* Day columns headers */}
                {weekDays.map(day => (
                  <div key={day.dateString} className="w-48 flex-none border-r bg-muted/50">
                    <div className={`text-center p-3 font-medium ${day.isToday ? 'bg-primary/10 text-primary' : 'text-foreground/80'} transition-colors`}>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{day.dayName}</div>
                      <div className={`text-lg ${day.isToday ? 'text-primary font-bold' : 'text-foreground'}`}>
                        {day.dayNumber}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table content */}
            <ScrollArea className="flex-1">
              <div className="min-h-full">
                {technicians.map(technician => {
                  const isCollapsed = collapsedTechnicians.has(technician.id);
                  const taskCount = getTechnicianTaskCount(technician.id);
                  
                  return (
                    <div key={technician.id} className="border-b last:border-b-0">
                      {isCollapsed ? (
                        // Collapsed view - single row with technician info and expand button
                        <div className="flex border-b border-border/20 hover:bg-muted/10 transition-colors bg-muted/5">
                          <div className="w-40 flex-none border-r p-2 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTechnicianCollapse(technician.id)}
                              className="h-6 w-6 p-0 hover:bg-primary/10"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <div className="p-1 bg-primary/10 rounded-sm">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium truncate">{technician.name}</span>
                            {taskCount > 0 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                                {taskCount}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="w-20 flex-none border-r p-2 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Réduit</span>
                          </div>
                          
                          {/* Day cells - collapsed placeholder */}
                          {weekDays.map(day => (
                            <div key={day.dateString} className="w-48 flex-none border-r last:border-r-0 p-2 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">···</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Expanded view - original time slots
                        timeSlots.map(slot => (
                          <div key={`${technician.id}-${slot.hour}`} className="flex border-b border-border/20 last:border-b-0 hover:bg-muted/10 transition-colors">
                            {/* Technician name - only show on first hour */}
                            <div className="w-40 flex-none border-r p-2 flex items-center gap-2">
                              {slot.hour === timeSlots[0].hour && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleTechnicianCollapse(technician.id)}
                                    className="h-6 w-6 p-0 hover:bg-primary/10"
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                  <div className="p-1 bg-primary/10 rounded-sm">
                                    <User className="h-3 w-3 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium truncate">{technician.name}</span>
                                  {taskCount > 0 && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                                      {taskCount}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                            
                            {/* Hour */}
                            <div className="w-20 flex-none border-r p-2 flex items-center justify-center">
                              <span className="text-sm font-mono text-muted-foreground">{slot.label}</span>
                            </div>
                            
                            {/* Day cells */}
                            {weekDays.map(day => {
                              const tasks = getTasksForSlot(technician.id, day.dateString, slot.hour);
                              return (
                                <div key={day.dateString} className="w-48 flex-none border-r last:border-r-0">
                                  <DroppableTimeSlot
                                    id={`${technician.id}|${day.dayIndex}|${slot.hour}`}
                                    tasks={tasks}
                                     onTaskClick={(task) => {
                                       console.log('Setting selected task:', task);
                                       setSelectedTask(task as Intervention);
                                     }}
                                    getTaskTypeConfig={getTaskTypeConfig}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
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