import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Ship, Wrench, AlertTriangle, CheckCircle2, Calendar, Eye } from 'lucide-react';
import { InterventionCompletionDialog } from '@/components/maintenance/InterventionCompletionDialog';
import { PreparationChecklistDialog } from '@/components/preparation/PreparationChecklistDialog';
import { toast } from 'sonner';
interface TechnicianTask {
  id: string;
  type: 'intervention' | 'preparation';
  title: string;
  description?: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  priority: string;
  color_code: string;
  boat?: {
    id: string;
    name: string;
    model?: string;
  };
  anomalies_count?: number;
  preparation_status?: string;
  intervention_type?: string;
  original_id: string; // ID original de l'intervention ou de la préparation
}
interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TechnicianTask | null;
  onCompleteIntervention: (task: TechnicianTask) => void;
  onOpenChecklist: (task: TechnicianTask) => void;
}
const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task,
  onCompleteIntervention,
  onOpenChecklist
}) => {
  if (!isOpen || !task) return null;
  const isIntervention = task.type === 'intervention';
  const isPreparation = task.type === 'preparation';
  const canComplete = isIntervention && task.status !== 'completed';
  const canOpenChecklist = isPreparation;
  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isIntervention ? <Wrench className="h-5 w-5" /> : <Ship className="h-5 w-5" />}
            {task.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p><strong>Type:</strong> {isIntervention ? 'Intervention' : 'Préparation'}</p>
            <p><strong>Bateau:</strong> {task.boat?.name} {task.boat?.model}</p>
            <p><strong>Horaire:</strong> {format(new Date(task.scheduled_start), 'HH:mm')} - {format(new Date(task.scheduled_end), 'HH:mm')}</p>
            <p><strong>Statut:</strong> 
              <Badge variant="outline" className="ml-2">
                {task.status === 'planned' ? 'Planifié' : task.status === 'in_progress' ? 'En cours' : task.status === 'completed' ? 'Terminé' : task.status}
              </Badge>
            </p>
            {task.description && <div>
                <strong>Description:</strong>
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              </div>}
            {task.anomalies_count !== undefined && task.anomalies_count > 0 && <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{task.anomalies_count} anomalie(s) détectée(s)</span>
              </div>}
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Fermer
            </Button>
            {canComplete && <Button onClick={() => onCompleteIntervention(task)} className="flex-1">Terminer</Button>}
            {canOpenChecklist && <Button onClick={() => onOpenChecklist(task)} className="flex-1">
                Ouvrir la checklist
              </Button>}
          </div>
        </CardContent>
      </Card>
    </div>;
};
export function TechnicianPlanningView() {
  const {
    user
  } = useAuth();
  const [currentDay, setCurrentDay] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<TechnicianTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [interventionToComplete, setInterventionToComplete] = useState<any>(null);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [preparationToCheck, setPreparationToCheck] = useState<string | null>(null);

  // Fetch technician's tasks for the current day
  const {
    data: tasks = [],
    isLoading
  } = useQuery({
    queryKey: ['technician-planning', user?.id, currentDay],
    queryFn: async () => {
      if (!user?.id) return [];
      const dayStart = new Date(currentDay);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDay);
      dayEnd.setHours(23, 59, 59, 999);

      // Fetch interventions
      const {
        data: interventions,
        error: interventionsError
      } = await supabase.from('interventions').select(`
          id, title, description, scheduled_date, scheduled_time, status, intervention_type,
          boats(id, name, model)
        `).eq('technician_id', user.id).eq('scheduled_date', currentDay.toISOString().split('T')[0]).order('scheduled_date');
      if (interventionsError) throw interventionsError;

      // Fetch preparations (exclude completed ones and those with 'ready' checklist status)
      const {
        data: preparations,
        error: preparationsError
      } = await supabase.from('planning_activities').select(`
          id, title, description, scheduled_start, scheduled_end, status, priority, color_code,
          boats(id, name, model),
          boat_preparation_checklists(status, anomalies_count)
        `).eq('technician_id', user.id).eq('activity_type', 'preparation').neq('status', 'completed').gte('scheduled_start', dayStart.toISOString()).lt('scheduled_start', dayEnd.toISOString()).order('scheduled_start');
      if (preparationsError) throw preparationsError;
      const allTasks: TechnicianTask[] = [
      // Convert interventions
      ...(interventions || []).map(intervention => {
        // Use the actual scheduled_time from database
        const scheduledDateTime = intervention.scheduled_time 
          ? new Date(`${intervention.scheduled_date}T${intervention.scheduled_time}`)
          : new Date(`${intervention.scheduled_date}T09:00:00`); // Fallback to 9AM if no time set
        
        // Default duration of 1 hour
        const endDateTime = new Date(scheduledDateTime.getTime() + (60 * 60 * 1000));
        
        return {
          id: `intervention-${intervention.id}`,
          original_id: intervention.id,
          type: 'intervention' as const,
          title: intervention.title,
          description: intervention.description,
          scheduled_start: scheduledDateTime.toISOString(),
          scheduled_end: endDateTime.toISOString(),
          status: intervention.status,
          priority: intervention.intervention_type === 'emergency' ? 'high' : 'medium',
          color_code: '#dc2626',
          boat: intervention.boats ? {
            id: intervention.boats.id,
            name: intervention.boats.name,
            model: intervention.boats.model
          } : undefined,
          intervention_type: intervention.intervention_type
        };
      }),
      // Convert preparations (filter out those with 'ready' checklist status)
      ...(preparations || []).filter(prep => prep.boat_preparation_checklists?.[0]?.status !== 'ready').map(prep => ({
        id: prep.id,
        original_id: prep.id,
        type: 'preparation' as const,
        title: prep.title,
        description: prep.description,
        scheduled_start: prep.scheduled_start,
        scheduled_end: prep.scheduled_end,
        status: prep.status,
        priority: prep.priority || 'medium',
        color_code: prep.color_code || '#3b82f6',
        boat: prep.boats ? {
          id: prep.boats.id,
          name: prep.boats.name,
          model: prep.boats.model
        } : undefined,
        anomalies_count: prep.boat_preparation_checklists?.[0]?.anomalies_count || 0,
        preparation_status: prep.boat_preparation_checklists?.[0]?.status
      }))];
      return allTasks;
    },
    enabled: !!user?.id
  });
  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDay(direction === 'next' ? addDays(currentDay, 1) : subDays(currentDay, 1));
  };
  const goToToday = () => {
    setCurrentDay(new Date());
  };

  // Sort tasks by scheduled time
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  }, [tasks]);
  const handleTaskClick = (task: TechnicianTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };
  const handleCompleteIntervention = (task: TechnicianTask) => {
    setShowTaskModal(false);

    // Prepare intervention data for completion dialog
    setInterventionToComplete({
      id: task.original_id,
      title: task.title,
      boat_id: task.boat?.id,
      technician_id: user?.id,
      intervention_type: task.intervention_type,
      boat: task.boat ? {
        id: task.boat.id,
        name: task.boat.name,
        model: task.boat.model || '',
        current_engine_hours: 0 // Will be fetched in the dialog
      } : null
    });
    setShowCompletionDialog(true);
  };
  const handleOpenChecklist = async (task: TechnicianTask) => {
    setShowTaskModal(false);

    // Find the preparation checklist ID from the planning activity
    try {
      const {
        data: checklist,
        error
      } = await supabase.from('boat_preparation_checklists').select('id').eq('planning_activity_id', task.original_id).single();
      if (error || !checklist) {
        toast.error('Impossible de trouver la checklist de préparation');
        return;
      }
      setPreparationToCheck(checklist.id);
      setShowChecklistDialog(true);
    } catch (error) {
      toast.error('Erreur lors de l\'ouverture de la checklist');
    }
  };
  const getStatusBadge = (status: string, type: string) => {
    const configs = {
      'planned': {
        variant: 'outline' as const,
        label: 'Planifié'
      },
      'in_progress': {
        variant: 'default' as const,
        label: 'En cours'
      },
      'completed': {
        variant: 'secondary' as const,
        label: 'Terminé'
      },
      'scheduled': {
        variant: 'outline' as const,
        label: 'Programmé'
      },
      'ready': {
        variant: 'secondary' as const,
        label: 'Prêt'
      }
    };
    const config = configs[status as keyof typeof configs] || configs.planned;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-orange-500';
      default:
        return 'border-l-blue-500';
    }
  };
  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Chargement de votre planning...</p>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Navigation du jour */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Mon planning
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDay('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDay('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-lg font-semibold">
                {format(currentDay, 'EEEE d MMMM yyyy', {
                locale: fr
              })}
              </p>
              {isToday(currentDay) && <Badge variant="default" className="text-xs mt-1">Aujourd'hui</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              {sortedTasks.length} tâche{sortedTasks.length !== 1 ? 's' : ''} planifiée{sortedTasks.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tâches du jour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tâches de la journée</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTasks.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Aucune tâche planifiée</h3>
              <p className="text-sm">Vous n'avez aucune intervention ou préparation prévue pour cette journée.</p>
            </div> : <div className="space-y-4">
              {sortedTasks.map(task => <div key={task.id} className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all bg-card ${getPriorityColor(task.priority)}`} onClick={() => handleTaskClick(task)}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {task.type === 'intervention' ? <Wrench className="h-5 w-5 text-red-600" /> : <Ship className="h-5 w-5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">{task.title}</h3>
                          {task.boat && <p className="text-sm text-muted-foreground mt-1">
                              Bateau: {task.boat.name} {task.boat.model && `(${task.boat.model})`}
                            </p>}
                          {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          {getStatusBadge(task.status, task.type)}
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(task.scheduled_start), 'HH:mm')} - {format(new Date(task.scheduled_end), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-xs">
                            {task.type === 'intervention' ? 'Intervention' : 'Préparation'}
                          </Badge>
                          {task.priority && <Badge variant="outline" className={`text-xs ${task.priority === 'high' ? 'border-red-500 text-red-700' : task.priority === 'medium' ? 'border-orange-500 text-orange-700' : 'border-blue-500 text-blue-700'}`}>
                              {task.priority === 'high' ? 'Priorité haute' : task.priority === 'medium' ? 'Priorité moyenne' : 'Priorité normale'}
                            </Badge>}
                        </div>
                        
                        {task.anomalies_count !== undefined && task.anomalies_count > 0 && <div className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">{task.anomalies_count} anomalie{task.anomalies_count !== 1 ? 's' : ''}</span>
                          </div>}
                      </div>
                    </div>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>

      {/* Modal détails tâche */}
      <TaskDetailsModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} task={selectedTask} onCompleteIntervention={handleCompleteIntervention} onOpenChecklist={handleOpenChecklist} />

      {/* Dialog completion intervention */}
      {interventionToComplete && <InterventionCompletionDialog isOpen={showCompletionDialog} onClose={() => {
      setShowCompletionDialog(false);
      setInterventionToComplete(null);
    }} intervention={interventionToComplete} />}

      {/* Dialog checklist préparation */}
      {preparationToCheck && <PreparationChecklistDialog preparationId={preparationToCheck} open={showChecklistDialog} onOpenChange={open => {
      setShowChecklistDialog(open);
      if (!open) {
        setPreparationToCheck(null);
      }
    }} />}
    </div>;
}