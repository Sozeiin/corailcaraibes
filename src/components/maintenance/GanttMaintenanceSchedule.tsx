import React, { useState, useMemo, useEffect } from 'react';
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
import { Plus, Clock, User, Ship, ChevronLeft, ChevronRight, Calendar, Wrench, Zap, Droplets, Cog, AlertTriangle, ChevronDown, ChevronUp, CloudRain, RefreshCw, Cloud, Sun } from 'lucide-react';
import { SimpleDroppableSlot } from './gantt/SimpleDroppableSlot';
import { SimpleDraggableTask } from './gantt/SimpleDraggableTask';
import { TaskDialog } from './gantt/TaskDialog';
import { InterventionContextMenu } from './gantt/InterventionContextMenu';
import { InterventionDetailsModal } from './gantt/InterventionDetailsModal';
import WeatherWidget from '@/components/weather/WeatherWidget';
import type { WeatherData } from '@/types/weather';
interface WeatherEvaluation {
  suitable: boolean;
  weather_data?: WeatherData;
  violated_rules?: Array<{
    rule_name: string;
    action: string;
    adjustment_days: number;
    reason: string;
  }>;
  recommendations?: Array<{
    rule_name: string;
    action: string;
    adjustment_days: number;
    reason: string;
  }>;
  reason?: string;
}
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
  activity_type?: 'maintenance' | 'preparation' | 'checkin' | 'checkout';
  original_intervention_id?: string;
  technician?: {
    id: string;
    name: string;
  };
  boats?: {
    id: string;
    name: string;
    model: string;
  };
}
interface Technician {
  id: string;
  name: string;
  role: string;
}
const TASK_TYPE_COLORS = {
  oil: {
    bg: 'bg-amber-50',
    border: 'border-l-amber-400',
    text: 'text-amber-800',
    icon: Droplets
  },
  engine: {
    bg: 'bg-blue-600',
    border: 'border-l-blue-500',
    text: 'text-white',
    icon: Cog
  },
  electrical: {
    bg: 'bg-purple-50',
    border: 'border-l-purple-400',
    text: 'text-purple-800',
    icon: Zap
  },
  mechanical: {
    bg: 'bg-green-50',
    border: 'border-l-green-400',
    text: 'text-green-800',
    icon: Wrench
  },
  emergency: {
    bg: 'bg-red-600',
    border: 'border-l-red-500',
    text: 'text-white',
    icon: AlertTriangle
  },
  preparation: {
    bg: 'bg-emerald-50',
    border: 'border-l-emerald-400',
    text: 'text-emerald-800',
    icon: Ship
  },
  checkin: {
    bg: 'bg-sky-50',
    border: 'border-l-sky-400',
    text: 'text-sky-800',
    icon: Ship
  },
  checkout: {
    bg: 'bg-indigo-50',
    border: 'border-l-indigo-400',
    text: 'text-indigo-800',
    icon: Ship
  },
  default: {
    bg: 'bg-gray-50',
    border: 'border-l-gray-400',
    text: 'text-gray-800',
    icon: Wrench
  }
};
export function GanttMaintenanceSchedule() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<Intervention | null>(null);
  const [selectedTask, setSelectedTask] = useState<Intervention | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedInterventionForDetails, setSelectedInterventionForDetails] = useState<Intervention | null>(null);
  const [showUnassignedPanel, setShowUnassignedPanel] = useState(true);
  const [collapsedTechnicians, setCollapsedTechnicians] = useState<Set<string>>(new Set());
  const [lastDroppedTechnician, setLastDroppedTechnician] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('fleetcat_last_dropped_technician');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [weatherEvaluations, setWeatherEvaluations] = useState<Record<string, WeatherEvaluation>>({});

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
    const startDate = startOfWeek(currentWeek, {
      weekStartsOn: 1
    });
    console.log('Week start date:', startDate);
    return Array.from({
      length: 7
    }, (_, i) => {
      const date = addDays(startDate, i);
      const dateString = format(date, 'yyyy-MM-dd'); // Use consistent date formatting
      console.log(`Day ${i}:`, date, 'dateString:', dateString);
      return {
        date,
        dateString,
        dayName: format(date, 'EEE', {
          locale: fr
        }),
        dayNumber: format(date, 'd'),
        dayIndex: i,
        // Add day index for easier drop target parsing
        isToday: isToday(date)
      };
    });
  }, [currentWeek]);

  // Fetch technicians - temporarily fetch all to debug
  const {
    data: technicians = []
  } = useQuery({
    queryKey: ['technicians', user?.baseId],
    queryFn: async () => {
      console.log('Fetching technicians for base_id:', user?.baseId);
      console.log('Current user data:', user);

      // First, let's see all technicians in the database
      const {
        data: allTechnicians,
        error: allError
      } = await supabase.from('profiles').select('id, name, role, base_id').eq('role', 'technicien');
      console.log('All technicians in database:', allTechnicians);

      // Then fetch for current base_id
      const {
        data,
        error
      } = await supabase.from('profiles').select('id, name, role, base_id').eq('role', 'technicien').eq('base_id', user?.baseId);
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

  // Fetch all planning activities (interventions + preparations)
  const {
    data: interventions = [],
    isLoading: interventionsLoading,
    error: interventionsError
  } = useQuery({
    queryKey: ['gantt-activities', weekDays[0]?.dateString, weekDays[6]?.dateString, user?.baseId],
    queryFn: async () => {
      if (!user) {
        console.log('No user available');
        return [];
      }
      console.log('Fetching planning activities for date range:', weekDays[0]?.dateString, 'to', weekDays[6]?.dateString);

      // Fetch planning activities in the current week
      const weekActivitiesPromise = supabase.from('planning_activities').select(`
          *,
          boats(id, name, model)
        `).gte('scheduled_start::date', weekDays[0]?.dateString).lte('scheduled_start::date', weekDays[6]?.dateString).eq('base_id', user?.baseId).order('scheduled_start');

      // Fetch all unassigned planning activities (for tasks panel)
      const unassignedActivitiesPromise = supabase.from('planning_activities').select(`
          *,
          boats(id, name, model)
        `).is('technician_id', null).eq('base_id', user?.baseId).order('scheduled_start');

      // Also fetch traditional interventions for backward compatibility
      const weekInterventionsPromise = supabase.from('interventions').select(`
          *,
          boats(id, name, model)
        `).gte('scheduled_date', weekDays[0]?.dateString).lte('scheduled_date', weekDays[6]?.dateString).eq('base_id', user?.baseId).order('scheduled_date');
      const unassignedInterventionsPromise = supabase.from('interventions').select(`
          *,
          boats(id, name, model)
        `).is('technician_id', null).eq('base_id', user?.baseId).order('scheduled_date');
      const [weekActivitiesResult, unassignedActivitiesResult, weekInterventionsResult, unassignedInterventionsResult] = await Promise.all([weekActivitiesPromise, unassignedActivitiesPromise, weekInterventionsPromise, unassignedInterventionsPromise]);
      if (weekActivitiesResult.error) {
        console.error('Error fetching week activities:', weekActivitiesResult.error);
        throw weekActivitiesResult.error;
      }
      if (unassignedActivitiesResult.error) {
        console.error('Error fetching unassigned activities:', unassignedActivitiesResult.error);
        throw unassignedActivitiesResult.error;
      }
      if (weekInterventionsResult.error) {
        console.error('Error fetching week interventions:', weekInterventionsResult.error);
        throw weekInterventionsResult.error;
      }
      if (unassignedInterventionsResult.error) {
        console.error('Error fetching unassigned interventions:', unassignedInterventionsResult.error);
        throw unassignedInterventionsResult.error;
      }

      // Combine all results
      const weekActivities = weekActivitiesResult.data || [];
      const unassignedActivities = unassignedActivitiesResult.data || [];
      const weekInterventions = weekInterventionsResult.data || [];
      const unassignedInterventions = unassignedInterventionsResult.data || [];
      const allActivities = [...weekActivities];

      // Add unassigned activities that are not already in the week view
      unassignedActivities.forEach(activity => {
        if (!weekActivities.find(wa => wa.id === activity.id)) {
          allActivities.push(activity);
        }
      });

      // Convert planning activities to intervention format
      const processedActivities = allActivities.map(activity => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        scheduled_date: activity.scheduled_start ? format(parseISO(activity.scheduled_start), 'yyyy-MM-dd') : '',
        scheduled_time: activity.scheduled_start ? format(parseISO(activity.scheduled_start), 'HH:mm:ss') : '',
        estimated_duration: activity.estimated_duration || 60,
        status: activity.status === 'completed' ? 'completed' : activity.status === 'in_progress' ? 'in_progress' : activity.status === 'cancelled' ? 'cancelled' : activity.status === 'planned' ? 'scheduled' : 'scheduled',
        intervention_type: activity.activity_type || 'maintenance',
        priority: activity.priority || 'medium',
        technician_id: activity.technician_id,
        boat_id: activity.boat_id,
        base_id: activity.base_id,
        color_code: activity.color_code,
        boats: activity.boats,
        activity_type: activity.activity_type,
        // Keep original type for differentiation
        original_intervention_id: activity.original_intervention_id
      }));

      // Convert traditional interventions to the same format
      const processedInterventions = [...weekInterventions, ...unassignedInterventions].filter(intervention => !allActivities.find(activity => activity.original_intervention_id === intervention.id)).map(intervention => ({
        ...intervention,
        estimated_duration: 60,
        // Default duration for interventions
        intervention_type: intervention.intervention_type || 'maintenance',
        priority: intervention.priority || 'medium',
        activity_type: 'maintenance' // Mark as traditional maintenance
      }));
      const combinedData = [...processedActivities, ...processedInterventions];
      console.log('Fetched combined activities and interventions:', combinedData);
      return combinedData as Intervention[];
    },
    enabled: !!user?.baseId && weekDays.length > 0
  });

  // Fetch weather evaluations for interventions
  const {
    data: weatherData,
    isLoading: weatherLoading
  } = useQuery({
    queryKey: ['weather-evaluations', interventions],
    queryFn: async () => {
      const evaluations: Record<string, WeatherEvaluation> = {};
      for (const intervention of interventions) {
        if (intervention.scheduled_date && intervention.base_id) {
          try {
            const {
              data,
              error
            } = await supabase.rpc('evaluate_weather_for_maintenance', {
              maintenance_date: intervention.scheduled_date,
              base_id_param: intervention.base_id
            });
            if (!error && data) {
              evaluations[intervention.id] = data as unknown as WeatherEvaluation;
            }
          } catch (err) {
            console.error('Error evaluating weather for intervention', intervention.id, err);
          }
        }
      }
      setWeatherEvaluations(evaluations);
      return evaluations;
    },
    enabled: interventions.length > 0
  });

  // Update activity/intervention mutation with optimistic updates
  const updateInterventionMutation = useMutation({
    mutationFn: async ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<Intervention>;
    }) => {
      console.log('🚀 Début de la mutation pour:', {
        id,
        updates
      });

      // Find the item to determine if it's a planning activity or traditional intervention
      const item = interventions.find(i => i.id === id);
      if (!item) {
        throw new Error(`Item non trouvé: ${id}`);
      }

      // Check if this is a planning activity more reliably
      const isPlanningActivity = (item.activity_type && item.activity_type === 'preparation') || 
                                  (item.activity_type && item.activity_type !== 'maintenance' && !item.original_intervention_id);
      if (isPlanningActivity) {
        // Update planning_activities table
        const scheduledStart = updates.scheduled_date && updates.scheduled_time ? 
          `${updates.scheduled_date}T${updates.scheduled_time}` : undefined;
        const scheduledEnd = scheduledStart ? 
          new Date(new Date(scheduledStart).getTime() + (item.estimated_duration || 60) * 60000).toISOString() : undefined;

        // Map status from intervention format to planning_activities format
        const mapStatusToPlanningActivity = (status: string): 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue' => {
          switch (status) {
            case 'scheduled':
              return 'planned';
            case 'in_progress':
              return 'in_progress';
            case 'completed':
              return 'completed';
            case 'cancelled':
              return 'cancelled';
            default:
              return 'planned';
          }
        };
        const cleanUpdates = {
          ...(updates.technician_id !== undefined && {
            technician_id: updates.technician_id
          }),
          ...(scheduledStart && {
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd || scheduledStart
          }),
          ...(updates.status && {
            status: mapStatusToPlanningActivity(updates.status)
          }),
          ...(updates.title && {
            title: updates.title
          }),
          ...(updates.description && {
            description: updates.description
          })
        };
        const {
          data,
          error
        } = await supabase.from('planning_activities').update(cleanUpdates).eq('id', id).select('id, title, technician_id, scheduled_start, status').single();
        if (error) {
          console.error('❌ Erreur planning_activities:', error);
          throw error;
        }

        // Also update boat_preparation_checklists if it's a preparation
        if (item.activity_type === 'preparation') {
          await supabase.from('boat_preparation_checklists').update({
            technician_id: updates.technician_id
          }).eq('planning_activity_id', id);
        }
        console.log('✅ Planning activity mise à jour:', data);
        return data;
      } else {
        // Update traditional interventions table
        const cleanUpdates = {
          ...(updates.technician_id !== undefined && {
            technician_id: updates.technician_id
          }),
          ...(updates.scheduled_date && {
            scheduled_date: updates.scheduled_date
          }),
          ...(updates.scheduled_time && {
            scheduled_time: updates.scheduled_time
          }),
          ...(updates.status && {
            status: updates.status
          }),
          ...(updates.title && {
            title: updates.title
          }),
          ...(updates.description && {
            description: updates.description
          })
        };
        const {
          data,
          error
        } = await supabase.from('interventions').update(cleanUpdates).eq('id', id).select('id, title, technician_id, scheduled_date, scheduled_time, status').single();
        if (error) {
          console.error('❌ Erreur interventions:', error);
          throw error;
        }
        console.log('✅ Intervention traditionnelle mise à jour:', data);
        return data;
      }
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['gantt-activities'] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['gantt-activities', weekDays[0]?.dateString, weekDays[6]?.dateString, user?.baseId]);
      
      // Optimistically update the local cache
      queryClient.setQueryData(['gantt-activities', weekDays[0]?.dateString, weekDays[6]?.dateString, user?.baseId], (old: Intervention[] = []) => {
        return old.map(intervention => 
          intervention.id === id 
            ? { ...intervention, ...updates }
            : intervention
        );
      });
      
      console.log('🔄 Mise à jour optimiste appliquée pour:', id, updates);
      
      // Return a context object with the snapshotted value
      return { previousData };
    },
    onSuccess: async (data, variables, context) => {
      console.log('✅ Mutation réussie, invalidation des queries');
      
      // Invalidate and refetch to ensure we have fresh data
      await queryClient.invalidateQueries({ queryKey: ['gantt-activities'] });
      await queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      await queryClient.invalidateQueries({ queryKey: ['interventions'] });
      
      // Reset drag state immediately
      setDraggedTask(null);
      
      const technicianName = data.technician_id ? 
        technicians?.find(t => t.id === data.technician_id)?.name || 'Technicien inconnu' : 
        'Non assigné';
      
      toast({
        title: "Tâche déplacée",
        description: `Assignée à: ${technicianName}`
      });
    },
    onError: (error, variables, context) => {
      console.error('💥 Erreur lors de la mutation:', error);
      
      // If we had previous data, roll back to it
      if (context?.previousData) {
        queryClient.setQueryData(['gantt-activities', weekDays[0]?.dateString, weekDays[6]?.dateString, user?.baseId], context.previousData);
      }
      
      // Reset drag state
      setDraggedTask(null);
      
      toast({
        title: "Erreur lors de la mise à jour",
        description: `Impossible de mettre à jour l'intervention: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🟢 DRAG START - Task ID:', event.active.id);
    const task = interventions.find(i => i.id === event.active.id);
    console.log('🟢 DRAG START - Found task:', {
      id: task?.id,
      title: task?.title,
      current_time: task?.scheduled_time,
      current_date: task?.scheduled_date,
      technician_id: task?.technician_id
    });
    setDraggedTask(task || null);
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !draggedTask) {
      setDraggedTask(null);
      return;
    }

    try {
      const dropId = over.id.toString();
      const parts = dropId.split('|');
      
      if (parts.length !== 3) {
        console.error('Invalid drop target format:', dropId);
        setDraggedTask(null);
        return;
      }

      const [technicianId, dateString, hourStr] = parts;
      const hour = parseInt(hourStr);
      
      if (isNaN(hour)) {
        console.error('Invalid drop target data:', { technicianId, dateString, hour });
        setDraggedTask(null);
        return;
      }
      const scheduledTime = `${hour.toString().padStart(2, '0')}:00:00`;

      // Store last technician
      const newLastDropped = {
        ...lastDroppedTechnician,
        [draggedTask.id]: technicianId === 'unassigned' ? '' : technicianId
      };
      setLastDroppedTechnician(newLastDropped);
      localStorage.setItem('fleetcat_last_dropped_technician', JSON.stringify(newLastDropped));

      const updateData = {
        id: draggedTask.id,
        updates: {
          technician_id: technicianId === 'unassigned' ? null : technicianId,
          scheduled_date: dateString,
          scheduled_time: scheduledTime
        }
      };

      // Update the intervention and wait for completion
      await updateInterventionMutation.mutateAsync(updateData);
    } catch (error) {
      console.error('Error in handleDragEnd:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déplacer la tâche",
        variant: "destructive"
      });
      setDraggedTask(null);
    }
  };
  // Group tasks by slot for efficient rendering
  const tasksBySlot = useMemo(() => {
    const grouped: Record<string, Intervention[]> = {};
    
    interventions.forEach(intervention => {
      if (!intervention.scheduled_date || !intervention.scheduled_time) return;
      
      const hour = parseInt(intervention.scheduled_time.split(':')[0]);
      const techId = intervention.technician_id || 'unassigned';
      const slotId = `${techId}|${intervention.scheduled_date}|${hour}`;
      
      if (!grouped[slotId]) {
        grouped[slotId] = [];
      }
      grouped[slotId].push(intervention);
    });
    
    return grouped;
  }, [interventions]);
  const getUnassignedTasks = () => {
    return interventions.filter(intervention => !intervention.technician_id);
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
  const getWeatherIcon = (condition?: string) => {
    if (!condition) return <Cloud className="h-4 w-4 text-gray-400" />;
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return <CloudRain className="h-4 w-4 text-blue-500" />;
    }
    if (lowerCondition.includes('cloud')) {
      return <Cloud className="h-4 w-4 text-gray-500" />;
    }
    return <Sun className="h-4 w-4 text-yellow-500" />;
  };
  const getWeatherSeverity = (evaluation?: WeatherEvaluation) => {
    if (!evaluation) return 'suitable';
    if (!evaluation.suitable) return 'blocked';
    if (evaluation.violated_rules && evaluation.violated_rules.length > 0) return 'warning';
    return 'suitable';
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocked':
        return 'bg-red-100 border-red-300 text-red-700';
      case 'warning':
        return 'bg-orange-100 border-orange-300 text-orange-700';
      default:
        return 'bg-green-100 border-green-300 text-green-700';
    }
  };
  const getDayWeatherEvaluation = (dateString: string) => {
    const dayInterventions = interventions.filter(i => i.scheduled_date === dateString);
    if (dayInterventions.length === 0) return undefined;
    const evaluations = dayInterventions.map(intervention => weatherEvaluations[intervention.id]).filter(Boolean);
    if (evaluations.length === 0) return undefined;
    return evaluations.find(evaluation => !evaluation.suitable) || evaluations[0];
  };

  // Context menu handlers
  const handleViewDetails = (intervention: Intervention) => {
    setSelectedInterventionForDetails(intervention);
    setDetailsModalOpen(true);
  };
  const handleEditIntervention = (intervention: Intervention) => {
    setSelectedTask(intervention);
    setShowTaskDialog(true);
  };
  const handleStatusChange = (intervention: Intervention, status: string) => {
    updateInterventionMutation.mutate({
      id: intervention.id,
      updates: {
        status: status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      }
    });
  };
  const handleReassign = (intervention: Intervention, technicianId: string) => {
    updateInterventionMutation.mutate({
      id: intervention.id,
      updates: {
        technician_id: technicianId || null
      }
    });
  };
  const handleDeleteIntervention = async (intervention: Intervention) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      try {
        await supabase.from('interventions').delete().eq('id', intervention.id);
        queryClient.invalidateQueries({
          queryKey: ['gantt-interventions']
        });
        toast({
          title: "Intervention supprimée avec succès"
        });
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer l'intervention",
          variant: "destructive"
        });
      }
    }
  };
  const handleWeatherEvaluation = (intervention: Intervention) => {
    handleViewDetails(intervention);
  };

  // Handle weather-based reschedule suggestions
  const handleWeatherReschedule = (interventionId: string, adjustmentDays: number) => {
    const intervention = interventions.find(i => i.id === interventionId);
    if (!intervention) return;
    const newDate = addDays(new Date(intervention.scheduled_date), adjustmentDays);
    updateInterventionMutation.mutate({
      id: interventionId,
      updates: {
        scheduled_date: format(newDate, 'yyyy-MM-dd')
      }
    });
  };

  // Real-time updates for weather data
  useEffect(() => {
    const channel = supabase.channel('weather-interventions-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'interventions'
    }, () => {
      queryClient.invalidateQueries({
        queryKey: ['weather-evaluations']
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  console.log('Render - Interventions:', interventions);
  console.log('Render - User:', user);
  console.log('Render - Loading:', interventionsLoading);
  console.log('Render - Error:', interventionsError);
  return <div className="h-screen flex flex-col bg-background">
      {/* Header modern avec météo */}
      <div className="flex-none border-b bg-gradient-to-r from-gray-50 to-blue-50 p-4 shadow-md rounded-b-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-24">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-2xl shadow-sm">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-base sm:text-2xl font-semibold text-gray-800">
                Planning Maintenance
              </h1>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-2xl border shadow-sm p-1">
              <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')} className="hover:bg-gray-100 rounded-xl">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium px-4 py-1 min-w-[200px] text-center text-sm">
                {format(weekDays[0]?.date || new Date(), 'd MMM', {
                locale: fr
              })} - {format(weekDays[6]?.date || new Date(), 'd MMM yyyy', {
                locale: fr
              })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')} className="hover:bg-gray-100 rounded-xl">
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* Bouton pour aller à la semaine du 23 septembre */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentWeek(new Date('2025-09-23'))}
                className="ml-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Semaine du 23 sept
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile panel toggle */}
            <Button variant="outline" size="sm" className="md:hidden rounded-xl shadow-sm" onClick={() => setShowUnassignedPanel(!showUnassignedPanel)}>
              {showUnassignedPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {/* Add task button */}
            <Button size="sm" onClick={() => setShowTaskDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle tâche</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>
        </div>
        
        {/* Weather Widget moderne */}
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <WeatherWidget compact />
        </div>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Panel tâches non assignées - compact et efficace */}
          {showUnassignedPanel && <div className="flex-none border-b bg-gray-50 max-h-32 rounded-t-2xl m-4 mb-0 shadow-md">
              <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-gray-50 rounded-t-2xl">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Tâches non assignées ({getUnassignedTasks().length})
                </h3>
              </div>
              <ScrollArea className="max-h-24 p-3">
                <div className="flex gap-2 overflow-x-auto">
                  {getUnassignedTasks().map(task => (
                    <div key={task.id} className="w-40 flex-none">
                      <SimpleDraggableTask 
                        task={task} 
                        onTaskClick={() => setSelectedTask(task)} 
                        getTaskTypeConfig={getTaskTypeConfig} 
                      />
                    </div>
                  ))}
                  {getUnassignedTasks().length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4 w-full">
                      Aucune tâche non assignée
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>}

          {/* Main table */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header tableau moderne */}
            <div className="flex-none border-b bg-gradient-to-r from-gray-100 to-blue-100 shadow-md m-4 rounded-2xl overflow-hidden">
              <div className="flex overflow-x-auto md:overflow-x-visible">
                {/* Colonne technicien */}
                <div className="w-40 md:min-w-[120px] flex-none border-r border-gray-200 bg-white p-4 font-semibold text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Technicien</span>
                </div>
                {/* Colonne heure */}
                <div className="w-20 md:min-w-[80px] flex-none border-r border-gray-200 bg-white p-4 font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm hidden sm:inline">Heure</span>
                  <span className="text-sm sm:hidden">H</span>
                </div>
                {/* Colonnes jours */}
                {weekDays.map(day => <div key={day.dateString} className="w-48 md:min-w-[120px] flex-none border-r border-gray-200 last:border-r-0 bg-gray-50">
                    <div className={`text-center p-4 font-medium transition-colors ${day.isToday ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">{day.dayName}</div>
                      <div className={`text-base sm:text-lg ${day.isToday ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                        {day.dayNumber}
                      </div>
                    </div>
                  </div>)}
              </div>
            </div>

            {/* Contenu tableau moderne et responsive */}
            <ScrollArea className="flex-1">
              <div className="min-h-full bg-white m-4 rounded-2xl shadow-md overflow-hidden">
                {technicians.map(technician => {
                const isCollapsed = collapsedTechnicians.has(technician.id);
                const taskCount = getTechnicianTaskCount(technician.id);
                return <div key={technician.id} className="border-b border-gray-200 last:border-b-0">
                      {isCollapsed ?
                  // Vue réduite - responsive
                  <div className="flex overflow-x-auto hover:bg-gray-50 transition-colors bg-gray-50/50">
                          <div className="w-40 md:min-w-[120px] flex-none border-r border-gray-200 p-4 flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => toggleTechnicianCollapse(technician.id)} className="h-6 w-6 p-0 hover:bg-blue-100 rounded-xl">
                              <ChevronDown className="h-3 w-3 text-blue-600" />
                            </Button>
                            <div className="p-1 bg-blue-100 rounded-xl">
                              <User className="h-3 w-3 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium truncate">{technician.name}</span>
                            {taskCount > 0 && <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-2xl">
                                {taskCount}
                              </Badge>}
                          </div>
                          
                          <div className="w-20 md:min-w-[80px] flex-none border-r border-gray-200 p-4 flex items-center justify-center">
                            <span className="text-xs text-gray-500">Réduit</span>
                          </div>
                          
                          {/* Cellules jours - mode réduit */}
                          {weekDays.map(day => <div key={day.dateString} className="w-48 md:min-w-[120px] flex-none border-r border-gray-200 last:border-r-0 p-4 flex items-center justify-center">
                              <span className="text-xs text-gray-400">···</span>
                            </div>)}
                        </div> :
                  // Vue étendue - créneaux horaires
                  timeSlots.map(slot => <div key={`${technician.id}-${slot.hour}`} className="flex overflow-x-auto md:overflow-x-visible border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                            {/* Nom technicien - affiché seulement à la première heure */}
                            <div className="w-40 md:min-w-[120px] flex-none border-r border-gray-200 p-4 flex items-center gap-2">
                              {slot.hour === timeSlots[0].hour && <>
                                  <Button variant="ghost" size="sm" onClick={() => toggleTechnicianCollapse(technician.id)} className="h-6 w-6 p-0 hover:bg-blue-100 rounded-xl">
                                    <ChevronUp className="h-3 w-3 text-blue-600" />
                                  </Button>
                                  <div className="p-1 bg-blue-100 rounded-xl">
                                    <User className="h-3 w-3 text-blue-600" />
                                  </div>
                                  <span className="text-sm font-medium truncate">{technician.name}</span>
                                  {taskCount > 0 && <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-2xl">
                                      {taskCount}
                                    </Badge>}
                                </>}
                            </div>
                            
                            {/* Heure */}
                            <div className="w-20 md:min-w-[80px] flex-none border-r border-gray-200 p-4 flex items-center justify-center">
                              <span className="text-sm font-mono text-gray-600">{slot.label}</span>
                              <span className="text-xs text-red-500 ml-1">({slot.hour})</span>
                            </div>
                            
                             {/* Cellules jours avec tâches */}
                             {weekDays.map((day, dayIndex) => {
                        const slotId = `${technician.id}|${day.dateString}|${slot.hour}`;
                        const tasks = tasksBySlot[slotId] || [];
                        
                        return <div key={day.dateString} className="w-48 md:min-w-[120px] flex-none border-r border-gray-200 last:border-r-0 hover:bg-gray-100 transition-colors">
                                      <SimpleDroppableSlot 
                                        id={slotId}
                                        tasks={tasks}
                                        onTaskClick={(task) => setSelectedTask(task as Intervention)}
                                        onTaskContextMenu={(task, e) => {
                                          setSelectedTask(task as Intervention);
                                          // Handle context menu here if needed
                                        }}
                                        getTaskTypeConfig={getTaskTypeConfig}
                                      />
                                  </div>;
                     })}
                           </div>)}
                    </div>;
              })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggedTask && <SimpleDraggableTask task={draggedTask} getTaskTypeConfig={getTaskTypeConfig} />}
        </DragOverlay>
      </DndContext>

      {/* Alertes météo modernes */}
      {Object.entries(weatherEvaluations).some(([_, evaluation]) => !evaluation.suitable) && <div className="m-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-orange-800 font-semibold mb-4">
            <AlertTriangle className="h-5 w-5" />
            Alertes météorologiques
          </div>
          <div className="space-y-4">
            {Object.entries(weatherEvaluations).filter(([_, evaluation]) => !evaluation.suitable).map(([interventionId, evaluation]) => {
          const intervention = interventions.find(i => i.id === interventionId);
          if (!intervention) return null;
          return <div key={interventionId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border shadow-sm">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{intervention.title}</div>
                      <div className="text-sm text-gray-600">
                        {intervention.boats?.name} - {format(new Date(intervention.scheduled_date), 'EEEE d MMMM', {
                  locale: fr
                })}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {evaluation.violated_rules?.map(rule => <Button key={rule.rule_name} size="sm" variant="outline" className="rounded-2xl" onClick={() => handleWeatherReschedule(intervention.id, rule.adjustment_days)}>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reporter de {rule.adjustment_days}j
                        </Button>)}
                    </div>
                  </div>;
        })}
          </div>
        </div>}

      {/* Task Dialog */}
      {(showTaskDialog || selectedTask) && <TaskDialog task={selectedTask} isOpen={showTaskDialog || !!selectedTask} onClose={() => {
      setShowTaskDialog(false);
      setSelectedTask(null);
    }} technicians={technicians} onTaskCreated={() => queryClient.invalidateQueries({
      queryKey: ['gantt-interventions']
    })} />}

      {/* Intervention Details Modal */}
      <InterventionDetailsModal intervention={selectedInterventionForDetails} weatherEvaluation={selectedInterventionForDetails ? weatherEvaluations[selectedInterventionForDetails.id] as any : undefined} open={detailsModalOpen} onOpenChange={setDetailsModalOpen} onEdit={handleEditIntervention} />
    </div>;
}