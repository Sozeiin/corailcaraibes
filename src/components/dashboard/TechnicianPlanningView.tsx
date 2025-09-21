import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Ship,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Eye
} from 'lucide-react';
import { InterventionCompletionDialog } from '@/components/maintenance/InterventionCompletionDialog';

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
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task,
  onCompleteIntervention
}) => {
  if (!isOpen || !task) return null;

  const isIntervention = task.type === 'intervention';
  const canComplete = isIntervention && task.status !== 'completed';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                {task.status === 'planned' ? 'Planifié' : 
                 task.status === 'in_progress' ? 'En cours' : 
                 task.status === 'completed' ? 'Terminé' : task.status}
              </Badge>
            </p>
            {task.description && (
              <div>
                <strong>Description:</strong>
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              </div>
            )}
            {task.anomalies_count !== undefined && task.anomalies_count > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{task.anomalies_count} anomalie(s) détectée(s)</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Fermer
            </Button>
            {canComplete && (
              <Button 
                onClick={() => onCompleteIntervention(task)}
                className="flex-1"
              >
                Terminer l'intervention
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export function TechnicianPlanningView() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<TechnicianTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [interventionToComplete, setInterventionToComplete] = useState<any>(null);

  // Generate week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentWeek]);

  // Fetch technician's tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['technician-planning', user?.id, currentWeek],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const end = endOfWeek(currentWeek, { weekStartsOn: 1 });

      // Fetch interventions
      const { data: interventions, error: interventionsError } = await supabase
        .from('interventions')
        .select(`
          id, title, description, scheduled_date, status, intervention_type,
          boats(id, name, model)
        `)
        .eq('technician_id', user.id)
        .gte('scheduled_date', start.toISOString().split('T')[0])
        .lte('scheduled_date', end.toISOString().split('T')[0])
        .order('scheduled_date');

      if (interventionsError) throw interventionsError;

      // Fetch preparations
      const { data: preparations, error: preparationsError } = await supabase
        .from('planning_activities')
        .select(`
          id, title, description, scheduled_start, scheduled_end, status, priority, color_code,
          boats(id, name, model),
          boat_preparation_checklists(status, anomalies_count)
        `)
        .eq('technician_id', user.id)
        .eq('activity_type', 'preparation')
        .gte('scheduled_start', start.toISOString())
        .lte('scheduled_end', end.toISOString())
        .order('scheduled_start');

      if (preparationsError) throw preparationsError;

      const allTasks: TechnicianTask[] = [
        // Convert interventions
        ...(interventions || []).map(intervention => {
          const scheduledDate = new Date(intervention.scheduled_date);
          scheduledDate.setHours(9, 0, 0, 0);
          const endDate = new Date(scheduledDate);
          endDate.setHours(17, 0, 0, 0);

          return {
            id: `intervention-${intervention.id}`,
            original_id: intervention.id,
            type: 'intervention' as const,
            title: intervention.title,
            description: intervention.description,
            scheduled_start: scheduledDate.toISOString(),
            scheduled_end: endDate.toISOString(),
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
        // Convert preparations
        ...(preparations || []).map(prep => ({
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
        }))
      ];

      return allTasks;
    },
    enabled: !!user?.id
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.scheduled_start), date));
  };

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

  const getStatusBadge = (status: string, type: string) => {
    const configs = {
      'planned': { variant: 'outline' as const, label: 'Planifié' },
      'in_progress': { variant: 'default' as const, label: 'En cours' },
      'completed': { variant: 'secondary' as const, label: 'Terminé' },
      'scheduled': { variant: 'outline' as const, label: 'Programmé' },
      'ready': { variant: 'secondary' as const, label: 'Prêt' }
    };
    
    const config = configs[status as keyof typeof configs] || configs.planned;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-orange-500';
      default: return 'border-l-blue-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Chargement de votre planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation de la semaine */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Mon planning
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
              >
                Aujourd'hui
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Semaine du {format(weekDays[0], 'd MMMM', { locale: fr })} au {format(weekDays[6], 'd MMMM yyyy', { locale: fr })}
          </p>
        </CardHeader>
      </Card>

      {/* Grille des jours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const isCurrentDay = isToday(day);
          
          return (
            <Card key={index} className={`${isCurrentDay ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-3">
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {format(day, 'EEEE', { locale: fr })}
                  </p>
                  <p className={`text-lg font-bold ${isCurrentDay ? 'text-primary' : ''}`}>
                    {format(day, 'd', { locale: fr })}
                  </p>
                  {isCurrentDay && (
                    <Badge variant="default" className="text-xs mt-1">Aujourd'hui</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayTasks.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune tâche</p>
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all bg-white ${getPriorityColor(task.priority)}`}
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex items-start gap-2">
                            {task.type === 'intervention' ? 
                              <Wrench className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" /> :
                              <Ship className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            }
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-sm truncate">{task.title}</h4>
                              {task.boat && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {task.boat.name}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(task.scheduled_start), 'HH:mm')}
                                </span>
                                {getStatusBadge(task.status, task.type)}
                              </div>
                              {task.anomalies_count !== undefined && task.anomalies_count > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                  <span className="text-xs text-amber-600">{task.anomalies_count}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal détails tâche */}
      <TaskDetailsModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        task={selectedTask}
        onCompleteIntervention={handleCompleteIntervention}
      />

      {/* Dialog completion intervention */}
      {interventionToComplete && (
        <InterventionCompletionDialog
          isOpen={showCompletionDialog}
          onClose={() => {
            setShowCompletionDialog(false);
            setInterventionToComplete(null);
          }}
          intervention={interventionToComplete}
        />
      )}
    </div>
  );
}