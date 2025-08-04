import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  BarChart3, 
  Clock, 
  Target,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TechnicianWorkload {
  id: string;
  name: string;
  totalActivities: number;
  totalHours: number;
  utilizationRate: number;
  efficiency: number;
  skillsMatch: number;
  status: 'underutilized' | 'optimal' | 'overloaded';
  activities: Array<{
    id: string;
    title: string;
    duration: number;
    date: string;
    skillRequired: string;
  }>;
}

interface OptimizationSuggestion {
  type: 'redistribute' | 'reschedule' | 'skill_match';
  description: string;
  impact: number;
  fromTechnician?: string;
  toTechnician?: string;
  activityId?: string;
}

interface ResourceOptimizerProps {
  baseId: string;
  weekStart?: Date;
}

export function ResourceOptimizer({ baseId, weekStart = new Date() }: ResourceOptimizerProps) {
  const [selectedWeek, setSelectedWeek] = useState(weekStart);
  const [activeTab, setActiveTab] = useState('overview');

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const end = endOfWeek(selectedWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedWeek]);

  // Fetch technicians and their activities
  const { data: resourceData, isLoading } = useQuery({
    queryKey: ['resource-optimization', baseId, selectedWeek],
    queryFn: async () => {
      const start = startOfWeek(selectedWeek, { weekStartsOn: 1 });
      const end = endOfWeek(selectedWeek, { weekStartsOn: 1 });

      const [techniciansResult, activitiesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, role')
          .eq('role', 'technicien'),
        
        supabase
          .from('planning_activities')
          .select('*')
          .eq('base_id', baseId)
          .gte('scheduled_start', start.toISOString())
          .lte('scheduled_end', end.toISOString())
      ]);

      if (techniciansResult.error || activitiesResult.error) {
        throw new Error('Erreur lors du chargement des données');
      }

      return {
        technicians: techniciansResult.data || [],
        activities: activitiesResult.data || []
      };
    }
  });

  // Calculate workload distribution
  const workloadAnalysis = useMemo((): TechnicianWorkload[] => {
    if (!resourceData) return [];

    return resourceData.technicians.map(technician => {
      const technicianActivities = resourceData.activities.filter(
        activity => activity.technician_id === technician.id
      );

      const totalHours = technicianActivities.reduce((sum, activity) => {
        return sum + (activity.estimated_duration || 60) / 60;
      }, 0);

      const maxWeeklyHours = 40;
      const utilizationRate = Math.min((totalHours / maxWeeklyHours) * 100, 100);

      // Simulate efficiency and skill match (in real app, this would be calculated from historical data)
      const efficiency = Math.random() * 30 + 70; // 70-100%
      const skillsMatch = Math.random() * 20 + 80; // 80-100%

      let status: 'underutilized' | 'optimal' | 'overloaded';
      if (utilizationRate < 60) status = 'underutilized';
      else if (utilizationRate > 85) status = 'overloaded';
      else status = 'optimal';

      return {
        id: technician.id,
        name: technician.name,
        totalActivities: technicianActivities.length,
        totalHours,
        utilizationRate,
        efficiency,
        skillsMatch,
        status,
        activities: technicianActivities.map(activity => ({
          id: activity.id,
          title: activity.title,
          duration: activity.estimated_duration || 60,
          date: activity.scheduled_start,
          skillRequired: activity.activity_type
        }))
      };
    });
  }, [resourceData]);

  // Generate optimization suggestions
  const optimizationSuggestions = useMemo((): OptimizationSuggestion[] => {
    if (!workloadAnalysis.length) return [];

    const suggestions: OptimizationSuggestion[] = [];
    
    const overloaded = workloadAnalysis.filter(t => t.status === 'overloaded');
    const underutilized = workloadAnalysis.filter(t => t.status === 'underutilized');

    // Suggest redistribution
    overloaded.forEach(overloadedTech => {
      underutilized.forEach(underutilizedTech => {
        if (overloadedTech.activities.length > 0) {
          suggestions.push({
            type: 'redistribute',
            description: `Transférer 1-2 activités de ${overloadedTech.name} vers ${underutilizedTech.name}`,
            impact: 15,
            fromTechnician: overloadedTech.name,
            toTechnician: underutilizedTech.name
          });
        }
      });
    });

    // Suggest rescheduling for better efficiency
    workloadAnalysis.forEach(tech => {
      if (tech.efficiency < 80) {
        suggestions.push({
          type: 'reschedule',
          description: `Réorganiser les activités de ${tech.name} pour améliorer l'efficacité`,
          impact: 10
        });
      }
    });

    // Suggest skill matching improvements
    workloadAnalysis.forEach(tech => {
      if (tech.skillsMatch < 85) {
        suggestions.push({
          type: 'skill_match',
          description: `Réassigner les tâches de ${tech.name} selon ses compétences`,
          impact: 12
        });
      }
    });

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }, [workloadAnalysis]);

  const getStatusColor = (status: TechnicianWorkload['status']) => {
    switch (status) {
      case 'overloaded': return 'destructive';
      case 'underutilized': return 'secondary';
      case 'optimal': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: TechnicianWorkload['status']) => {
    switch (status) {
      case 'overloaded': return <AlertTriangle className="w-4 h-4" />;
      case 'underutilized': return <Clock className="w-4 h-4" />;
      case 'optimal': return <CheckCircle className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (isLoading || !resourceData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Optimiseur de Ressources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Analyse des ressources en cours...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Optimiseur de Ressources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="workload">Charge de travail</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Techniciens actifs</span>
                  </div>
                  <p className="text-2xl font-bold">{workloadAnalysis.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Utilisation moyenne</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {Math.round(workloadAnalysis.reduce((sum, t) => sum + t.utilizationRate, 0) / workloadAnalysis.length || 0)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Efficacité moyenne</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {Math.round(workloadAnalysis.reduce((sum, t) => sum + t.efficiency, 0) / workloadAnalysis.length || 0)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">État des ressources</h4>
              {workloadAnalysis.map(technician => (
                <div key={technician.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(technician.status)}
                    <div>
                      <p className="font-medium">{technician.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {technician.totalActivities} activités • {technician.totalHours.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(technician.status)}>
                      {technician.status}
                    </Badge>
                    <span className="text-sm font-medium">
                      {Math.round(technician.utilizationRate)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="workload" className="space-y-4">
            <ScrollArea className="h-96">
              {workloadAnalysis.map(technician => (
                <Card key={technician.id} className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{technician.name}</h4>
                      <Badge variant={getStatusColor(technician.status)}>
                        {technician.status}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Utilisation</span>
                          <span>{Math.round(technician.utilizationRate)}%</span>
                        </div>
                        <Progress value={technician.utilizationRate} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Efficacité</span>
                          <span>{Math.round(technician.efficiency)}%</span>
                        </div>
                        <Progress value={technician.efficiency} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Adéquation compétences</span>
                          <span>{Math.round(technician.skillsMatch)}%</span>
                        </div>
                        <Progress value={technician.skillsMatch} className="h-2" />
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>{technician.totalActivities} activités planifiées</p>
                        <p>{technician.totalHours.toFixed(1)} heures de travail</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {optimizationSuggestions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>Aucune optimisation nécessaire</p>
                <p className="text-sm">Vos ressources sont bien réparties !</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {optimizationSuggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">
                            {suggestion.type === 'redistribute' && 'Redistribution'}
                            {suggestion.type === 'reschedule' && 'Réorganisation'}
                            {suggestion.type === 'skill_match' && 'Optimisation compétences'}
                          </span>
                        </div>
                        <Badge variant="outline">
                          +{suggestion.impact}% efficacité
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {suggestion.description}
                      </p>
                      
                      <Button size="sm" variant="outline">
                        Appliquer la suggestion
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}