import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wrench, 
  Ship, 
  Clock, 
  CheckCircle,
  Calendar,
  AlertTriangle,
  Play,
  Scan,
  Package,
  Eye,
  ArrowRight,
  Sun,
  CloudRain
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import WeatherWidget from '@/components/weather/WeatherWidget';

interface TodayTask {
  id: string;
  type: 'intervention' | 'preparation';
  title: string;
  boat_name: string;
  boat_model: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  isOverdue: boolean;
  hoursRemaining: number;
}

export function TechnicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Récupération des interventions du technicien
  const { data: interventions = [] } = useQuery({
    queryKey: ['technician-dashboard-interventions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          id, title, scheduled_date, status,
          boats(name, model)
        `)
        .eq('technician_id', user?.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Récupération des préparations du technicien
  const { data: preparations = [] } = useQuery({
    queryKey: ['technician-dashboard-preparations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_activities')
        .select(`
          id, title, scheduled_start, scheduled_end, status,
          boats(name, model)
        `)
        .eq('technician_id', user?.id)
        .eq('activity_type', 'preparation')
        .in('status', ['planned', 'in_progress'])
        .order('scheduled_start', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Transformation des données en tâches unifiées
  const todayTasks: TodayTask[] = [
    ...interventions.map(intervention => {
      const scheduled = new Date(intervention.scheduled_date);
      const now = new Date();
      const hoursRemaining = differenceInHours(scheduled, now);
      
      return {
        id: intervention.id,
        type: 'intervention' as const,
        title: intervention.title,
        boat_name: intervention.boats?.name || 'Bateau inconnu',
        boat_model: intervention.boats?.model || '',
        scheduled_start: intervention.scheduled_date,
        scheduled_end: intervention.scheduled_date,
        status: intervention.status,
        priority: (hoursRemaining < 2 ? 'high' : hoursRemaining < 24 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        isOverdue: hoursRemaining < 0,
        hoursRemaining: Math.abs(hoursRemaining)
      };
    }),
    ...preparations.map(prep => {
      const scheduledStart = new Date(prep.scheduled_start);
      const scheduledEnd = new Date(prep.scheduled_end);
      const now = new Date();
      const hoursRemaining = differenceInHours(scheduledEnd, now);
      
      return {
        id: prep.id,
        type: 'preparation' as const,
        title: prep.title,
        boat_name: prep.boats?.name || 'Bateau inconnu',
        boat_model: prep.boats?.model || '',
        scheduled_start: prep.scheduled_start,
        scheduled_end: prep.scheduled_end,
        status: prep.status,
        priority: (hoursRemaining < 2 ? 'high' : hoursRemaining < 24 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        isOverdue: hoursRemaining < 0,
        hoursRemaining: Math.abs(hoursRemaining)
      };
    })
  ].sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

  // Filtrage des tâches d'aujourd'hui et demain
  const todaysTasks = todayTasks.filter(task => 
    isToday(new Date(task.scheduled_start)) || task.isOverdue
  );
  
  const tomorrowsTasks = todayTasks.filter(task => 
    isTomorrow(new Date(task.scheduled_start))
  );

  const getTaskIcon = (type: string) => {
    return type === 'intervention' ? Wrench : Ship;
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue) {
      return <Badge variant="destructive" className="text-xs">En retard</Badge>;
    }

    const configs = {
      'scheduled': { variant: 'outline' as const, label: 'Programmée' },
      'planned': { variant: 'outline' as const, label: 'Planifiée' },
      'in_progress': { variant: 'default' as const, label: 'En cours' },
    };
    
    const config = configs[status as keyof typeof configs] || configs.scheduled;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-orange-500 bg-orange-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const handleTaskClick = (task: TodayTask) => {
    if (task.type === 'intervention') {
      navigate('/maintenance');
    } else {
      navigate('/boat-preparation');
    }
  };

  // Statistiques rapides
  const stats = {
    total: todaysTasks.length,
    overdue: todaysTasks.filter(t => t.isOverdue).length,
    inProgress: todaysTasks.filter(t => t.status === 'in_progress').length,
    upcoming: tomorrowsTasks.length
  };

  return (
    <div className="space-y-6">
      {/* En-tête personnalisé technicien */}
      <div className="bg-gradient-to-r from-marine-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bonjour {user?.name} 👋</h1>
            <p className="text-marine-100 mt-1">
              {todaysTasks.length > 0 
                ? `Vous avez ${todaysTasks.length} tâche${todaysTasks.length > 1 ? 's' : ''} aujourd'hui`
                : 'Aucune tâche prévue aujourd\'hui'
              }
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-marine-200">
              {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-marine-600">{stats.total}</div>
            <div className="text-xs text-gray-600">Tâches aujourd'hui</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-gray-600">En retard</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
            <div className="text-xs text-gray-600">En cours</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <div className="text-xs text-gray-600">Demain</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tâches d'aujourd'hui - Prend 2 colonnes sur large */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-marine-600" />
                Mes tâches d'aujourd'hui
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaysTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune tâche prévue aujourd'hui</p>
                  <p className="text-sm mt-2">Profitez de votre journée ! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysTasks.map((task) => {
                    const TaskIcon = getTaskIcon(task.type);
                    return (
                      <div
                        key={`${task.type}-${task.id}`}
                        className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${getPriorityColor(task.priority)}`}
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <TaskIcon className="h-5 w-5 mt-0.5 text-marine-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate">{task.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {task.type === 'intervention' ? 'Maintenance' : 'Préparation'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                🚤 {task.boat_name} {task.boat_model && `(${task.boat_model})`}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(task.scheduled_start), 'HH:mm')}
                                </span>
                                {task.isOverdue ? (
                                  <span className="text-red-600 font-medium">
                                    En retard de {task.hoursRemaining}h
                                  </span>
                                ) : (
                                  <span>
                                    {task.hoursRemaining < 1 
                                      ? 'À commencer maintenant' 
                                      : `Dans ${Math.round(task.hoursRemaining)}h`
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {getStatusBadge(task.status, task.isOverdue)}
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => navigate('/stock-scanner')}
                >
                  <Scan className="h-6 w-6" />
                  <span className="text-xs">Scanner Stock</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => navigate('/maintenance')}
                >
                  <Wrench className="h-6 w-6" />
                  <span className="text-xs">Maintenance</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => navigate('/boat-preparation')}
                >
                  <Ship className="h-6 w-6" />
                  <span className="text-xs">Préparations</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => navigate('/boats')}
                >
                  <Eye className="h-6 w-6" />
                  <span className="text-xs">Voir Bateaux</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar droite */}
        <div className="space-y-4">
          {/* Météo */}
          <WeatherWidget />

          {/* Tâches de demain */}
          {tomorrowsTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Demain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tomorrowsTasks.slice(0, 3).map((task) => {
                    const TaskIcon = getTaskIcon(task.type);
                    return (
                      <div key={`${task.type}-${task.id}`} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <TaskIcon className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium truncate">{task.title}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {task.boat_name} • {format(new Date(task.scheduled_start), 'HH:mm')}
                        </p>
                      </div>
                    );
                  })}
                  {tomorrowsTasks.length > 3 && (
                    <p className="text-xs text-gray-500 text-center pt-2">
                      +{tomorrowsTasks.length - 3} autre{tomorrowsTasks.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progression */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Tâches d'aujourd'hui</span>
                    <span className="text-sm text-gray-600">
                      {stats.inProgress}/{stats.total}
                    </span>
                  </div>
                  <Progress 
                    value={stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}