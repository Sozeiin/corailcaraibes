import React, { useState, useEffect, useMemo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  Ship,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { PlanningActivityCard } from './PlanningActivityCard';
import { TimeGrid } from './TimeGrid';
import { UnassignedTasksSidebar } from './UnassignedTasksSidebar';
import { ActivityDialog } from './ActivityDialog';
import { ViewModeSelector, ViewMode } from './ViewModeSelector';
import { PlanningFilters, PlanningFilters as FilterType } from './PlanningFilters';
import { ActivityTemplateManager } from './ActivityTemplateManager';
import { ResourceView } from './ResourceView';
import { ChronologicalView } from './ChronologicalView';
import { MonthlyView } from './MonthlyView';
import { AISuggestions } from './AISuggestions';
import { ConflictManager } from './ConflictManager';
import { ResourceOptimizer } from './ResourceOptimizer';

interface PlanningActivity {
  id: string;
  activity_type: 'maintenance' | 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  title: string;
  description?: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_duration: number;
  actual_start?: string;
  actual_end?: string;
  actual_duration?: number;
  technician_id?: string;
  boat_id?: string;
  base_id: string;
  planned_by?: string;
  priority: string;
  color_code: string;
  rental_id?: string;
  checklist_completed: boolean;
  delay_minutes: number;
  performance_rating?: number;
  notes?: string;
  technician?: {
    id: string;
    name: string;
  } | null;
  boat?: {
    id: string;
    name: string;
  } | null;
}

interface Technician {
  id: string;
  name: string;
  role: string;
}

export function GanttPlanningView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<PlanningActivity | null>(null);
  const [draggedActivity, setDraggedActivity] = useState<PlanningActivity | null>(null);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('gantt');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showConflictManager, setShowConflictManager] = useState(false);
  const [showResourceOptimizer, setShowResourceOptimizer] = useState(false);
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    technician: '',
    activityType: '',
    status: '',
    priority: '',
    dateRange: { from: undefined, to: undefined },
    boat: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Add debug logging
  console.log('GanttPlanningView user:', user);

  // Generate time slots (30-minute intervals)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push({
          hour,
          minute,
          label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        });
      }
    }
    return slots;
  }, []);

  // Generate week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 14; i++) { // Two weeks
      days.push(addDays(start, i));
    }
    return days;
  }, [currentWeek]);

  // Fetch technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('role', 'technicien');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch planning activities for the current two weeks
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['planning-activities', currentWeek],
    queryFn: async () => {
      const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const end = endOfWeek(addWeeks(currentWeek, 1), { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from('planning_activities')
        .select(`
          *,
          technician:profiles(id, name),
          boat:boats(id, name)
        `)
        .gte('scheduled_start', start.toISOString())
        .lte('scheduled_end', end.toISOString())
        .order('scheduled_start');
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        technician: Array.isArray(item.technician) ? item.technician[0] || null : item.technician || null,
        boat: Array.isArray(item.boat) ? item.boat[0] || null : item.boat || null
      })) as PlanningActivity[];
    }
  });

  // Fetch unassigned activities
  const { data: unassignedActivities = [] } = useQuery({
    queryKey: ['unassigned-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_activities')
        .select(`
          *,
          boat:boats(id, name)
        `)
        .is('technician_id', null)
        .eq('status', 'planned')
        .order('scheduled_start');
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        technician: null,
        boat: item.boat || null,
        base_id: item.base_id,
        priority: item.priority || 'medium',
        checklist_completed: item.checklist_completed || false,
        delay_minutes: item.delay_minutes || 0
      })) as PlanningActivity[];
    }
  });

  // Update activity mutation
  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlanningActivity> }) => {
      const { error } = await supabase
        .from('planning_activities')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-activities'] });
      toast({
        title: "Activité mise à jour",
        description: "L'activité a été mise à jour avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'activité.",
        variant: "destructive",
      });
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    const activity = activities.find(a => a.id === event.active.id) || 
                    unassignedActivities.find(a => a.id === event.active.id);
    setDraggedActivity(activity || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedActivity(null);

    if (!over) return;

    const activity = activities.find(a => a.id === active.id) || 
                    unassignedActivities.find(a => a.id === active.id);
    
    if (!activity) return;

    const dropData = over.data?.current;
    if (!dropData) return;

    const { technicianId, date, timeSlot } = dropData;
    
    // Calculate new start and end times
    const newStart = new Date(date);
    newStart.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
    
    const newEnd = new Date(newStart);
    newEnd.setMinutes(newEnd.getMinutes() + activity.estimated_duration);

    updateActivityMutation.mutate({
      id: activity.id,
      updates: {
        technician_id: technicianId,
        scheduled_start: newStart.toISOString(),
        scheduled_end: newEnd.toISOString()
      }
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'next' ? addWeeks(currentWeek, 2) : subWeeks(currentWeek, 2));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getActivitiesForTechnicianAndDay = (technicianId: string, date: Date) => {
    return activities.filter(activity => 
      activity.technician_id === technicianId &&
      isSameDay(new Date(activity.scheduled_start), date)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-8rem)] bg-background">
        {/* Sidebar for unassigned tasks */}
        {showSidebar && (
          <UnassignedTasksSidebar 
            activities={unassignedActivities}
            onClose={() => setShowSidebar(false)}
            onCreateActivity={() => setShowActivityDialog(true)}
          />
        )}

        {/* Main planning grid */}
        <div className="flex-1 flex flex-col">
          {/* Header with navigation */}
          <Card className="rounded-none border-l-0 border-r-0 border-t-0">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {!showSidebar && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSidebar(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Planning Intelligent
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAISuggestions(!showAISuggestions)}
                      className="flex items-center gap-1"
                    >
                      <Sparkles className="w-4 h-4" />
                      IA
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConflictManager(!showConflictManager)}
                      className="flex items-center gap-1"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Conflits
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResourceOptimizer(!showResourceOptimizer)}
                      className="flex items-center gap-1"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Ressources
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Aujourd'hui
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium ml-4">
                    {format(weekDays[0], 'dd MMM', { locale: fr })} - {format(weekDays[13], 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Filters */}
          <PlanningFilters 
            filters={filters}
            onFiltersChange={setFilters}
            technicians={technicians}
            boats={[]}
            onReset={() => setFilters({
              search: '', technician: '', activityType: '', status: '', priority: '',
              dateRange: { from: undefined, to: undefined }, boat: ''
            })}
          />

          {/* View content based on selected mode */}
          {viewMode === 'gantt' && (
            <TimeGrid 
              weekDays={weekDays} 
              timeSlots={timeSlots} 
              technicians={technicians}
              activities={activities}
              onActivityClick={(activity) => setSelectedActivity(activity)}
              getActivitiesForTechnicianAndDay={getActivitiesForTechnicianAndDay}
            />
          )}
          
          {viewMode === 'resource' && (
            <ResourceView 
              technicians={technicians}
              activities={activities}
              onActivityClick={(activity) => setSelectedActivity(activity)}
            />
          )}
          
          {viewMode === 'chronological' && (
            <ChronologicalView 
              activities={activities}
              onActivityClick={(activity) => setSelectedActivity(activity)}
            />
          )}
          
          {viewMode === 'monthly' && (
            <MonthlyView 
              activities={activities}
              onActivityClick={(activity) => setSelectedActivity(activity)}
            />
          )}
        </div>

        {/* Side panels for advanced features */}
        {showAISuggestions && user?.baseId && (
          <div className="w-96 border-l bg-background overflow-hidden">
            <AISuggestions
              baseId={user.baseId}
              onApplySuggestion={(suggestion) => {
                // Handle AI suggestion application
                console.log('Applying suggestion:', suggestion);
                // This would integrate with the planning system
              }}
              onDismissSuggestion={(suggestionId) => {
                console.log('Dismissing suggestion:', suggestionId);
              }}
            />
          </div>
        )}

        {showConflictManager && user?.baseId && (
          <div className="w-96 border-l bg-background overflow-hidden">
            <ConflictManager
              baseId={user.baseId}
            />
          </div>
        )}

        {showResourceOptimizer && user?.baseId && (
          <div className="w-96 border-l bg-background overflow-hidden">
            <ResourceOptimizer
              baseId={user.baseId}
              weekStart={currentWeek}
            />
          </div>
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {draggedActivity && (
            <PlanningActivityCard activity={draggedActivity} isDragging />
          )}
        </DragOverlay>

        {/* Activity dialog */}
        {showActivityDialog && (
          <ActivityDialog 
            open={showActivityDialog}
            onOpenChange={setShowActivityDialog}
            activity={selectedActivity}
            technicians={technicians}
          />
        )}
      </div>
    </DndContext>
  );
}