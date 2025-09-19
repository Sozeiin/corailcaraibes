import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange } from '@/components/ui/date-range-picker';
import { useEffect } from 'react';

export interface PreparationReportData {
  totalPreparations: number;
  completedPreparations: number;
  inProgressPreparations: number;
  pendingPreparations: number;
  completionRate: number;
  averageCompletionTime: number;
  anomaliesCount: number;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyTrend: Array<{ month: string; preparations: number; completed: number }>;
  technicianPerformance: Array<{
    name: string;
    totalPreparations: number;
    completedPreparations: number;
    averageTime: number;
    completionRate: number;
    anomaliesDetected: number;
  }>;
  boatPreparationStats: Array<{
    boatName: string;
    totalPreparations: number;
    averageTime: number;
    anomaliesCount: number;
    lastPreparation: string | null;
  }>;
  templateUsage: Array<{
    templateName: string;
    usageCount: number;
    averageCompletionTime: number;
  }>;
}

export function usePreparationReportsData(dateRange: DateRange | undefined) {
  const { user } = useAuth();

  const queryResult = useQuery({
    queryKey: ['preparation-reports-data', dateRange, user?.baseId],
    queryFn: async (): Promise<PreparationReportData> => {
      const from = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = dateRange?.to?.toISOString() || new Date().toISOString();

      // Base filter for user role
      const buildQuery = (query: any) => {
        return user?.role === 'direction' ? query : query.eq('base_id', user?.baseId!);
      };

      // Fetch preparation data from planning_activities and boat_preparation_checklists
      const [
        preparationActivities,
        preparationChecklists,
        techniciansData,
        boatsData,
        templatesData
      ] = await Promise.all([
        // Preparation activities from planning
        buildQuery(
          supabase
            .from('planning_activities')
            .select(`
              id, status, scheduled_start, scheduled_end, actual_start, actual_end,
              technician_id, boat_id, base_id, created_at,
              boats(name),
              profiles!planning_activities_technician_id_fkey(name)
            `)
            .eq('activity_type', 'preparation')
            .gte('created_at', from)
            .lte('created_at', to)
        ),

        // Preparation checklists
        buildQuery(
          supabase
            .from('boat_preparation_checklists')
            .select(`
              id, status, completion_date, anomalies_count, created_at, updated_at,
              boat_id, technician_id, template_id,
              boats(name, base_id),
              profiles!boat_preparation_checklists_technician_id_fkey(name),
              preparation_checklist_templates(name)
            `)
            .gte('created_at', from)
            .lte('created_at', to)
        ),

        // Technicians data
        buildQuery(
          supabase
            .from('profiles')
            .select('id, name, role, base_id')
            .eq('role', 'technicien')
        ),

        // Boats data
        buildQuery(
          supabase
            .from('boats')
            .select('id, name, base_id')
        ),

        // Templates data
        buildQuery(
          supabase
            .from('preparation_checklist_templates')
            .select('id, name, base_id')
        )
      ]);

      return processPreparationReportData(
        preparationActivities.data || [],
        preparationChecklists.data || [],
        techniciansData.data || [],
        boatsData.data || [],
        templatesData.data || []
      );
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels = [
      supabase
        .channel('preparation-activities-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'planning_activities', filter: `activity_type=eq.preparation` },
          () => queryResult.refetch()
        ),
      supabase
        .channel('preparation-checklists-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'boat_preparation_checklists' },
          () => queryResult.refetch()
        )
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, queryResult.refetch]);

  return queryResult;
}

function processPreparationReportData(
  activities: any[],
  checklists: any[],
  technicians: any[],
  boats: any[],
  templates: any[]
): PreparationReportData {
  // Combine activities and checklists data
  const allPreparations = [...activities, ...checklists];
  
  const total = allPreparations.length;
  const completed = allPreparations.filter(p => p.status === 'completed').length;
  const inProgress = allPreparations.filter(p => p.status === 'in_progress').length;
  const pending = allPreparations.filter(p => p.status === 'pending' || p.status === 'planned').length;

  // Calculate average completion time
  const completedWithTime = allPreparations.filter(p => 
    p.status === 'completed' && p.actual_start && p.actual_end
  );
  const averageCompletionTime = completedWithTime.length > 0
    ? completedWithTime.reduce((sum, p) => {
        const start = new Date(p.actual_start || p.created_at);
        const end = new Date(p.actual_end || p.completion_date);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      }, 0) / completedWithTime.length
    : 0;

  // Count anomalies
  const anomaliesCount = checklists.reduce((sum, c) => sum + (c.anomalies_count || 0), 0);

  // Status distribution
  const statusDistribution = [
    { name: 'Terminées', value: completed, color: 'hsl(var(--success))' },
    { name: 'En cours', value: inProgress, color: 'hsl(var(--warning))' },
    { name: 'En attente', value: pending, color: 'hsl(var(--muted))' }
  ];

  // Monthly trend
  const monthlyData = new Map();
  allPreparations.forEach(prep => {
    const month = new Date(prep.created_at).toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'short' 
    });
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { preparations: 0, completed: 0 });
    }
    const data = monthlyData.get(month);
    data.preparations++;
    if (prep.status === 'completed') data.completed++;
  });

  const monthlyTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    preparations: data.preparations,
    completed: data.completed
  }));

  // Technician performance
  const technicianPerformance = technicians.map(tech => {
    const techPreparations = allPreparations.filter(p => p.technician_id === tech.id);
    const techCompleted = techPreparations.filter(p => p.status === 'completed');
    const techAnomalies = checklists
      .filter(c => c.technician_id === tech.id)
      .reduce((sum, c) => sum + (c.anomalies_count || 0), 0);

    const avgTime = techCompleted.length > 0
      ? techCompleted.reduce((sum, p) => {
          if (p.actual_start && p.actual_end) {
            const start = new Date(p.actual_start);
            const end = new Date(p.actual_end);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
          }
          return sum;
        }, 0) / techCompleted.length
      : 0;

    return {
      name: tech.name || 'Technicien inconnu',
      totalPreparations: techPreparations.length,
      completedPreparations: techCompleted.length,
      averageTime: Math.round(avgTime),
      completionRate: techPreparations.length > 0 ? Math.round((techCompleted.length / techPreparations.length) * 100) : 0,
      anomaliesDetected: techAnomalies
    };
  }).filter(tech => tech.totalPreparations > 0);

  // Boat preparation stats
  const boatStats = boats.map(boat => {
    const boatPreparations = allPreparations.filter(p => p.boat_id === boat.id);
    const boatCompleted = boatPreparations.filter(p => p.status === 'completed');
    const boatAnomalies = checklists
      .filter(c => c.boat_id === boat.id)
      .reduce((sum, c) => sum + (c.anomalies_count || 0), 0);

    const avgTime = boatCompleted.length > 0
      ? boatCompleted.reduce((sum, p) => {
          if (p.actual_start && p.actual_end) {
            const start = new Date(p.actual_start);
            const end = new Date(p.actual_end);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
          }
          return sum;
        }, 0) / boatCompleted.length
      : 0;

    const lastPrep = boatPreparations
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    return {
      boatName: boat.name,
      totalPreparations: boatPreparations.length,
      averageTime: Math.round(avgTime),
      anomaliesCount: boatAnomalies,
      lastPreparation: lastPrep ? new Date(lastPrep.created_at).toLocaleDateString('fr-FR') : null
    };
  }).filter(boat => boat.totalPreparations > 0);

  // Template usage
  const templateUsage = templates.map(template => {
    const templateChecklists = checklists.filter(c => c.template_id === template.id);
    const avgTime = templateChecklists.length > 0
      ? templateChecklists.reduce((sum, c) => {
          if (c.created_at && c.completion_date) {
            const start = new Date(c.created_at);
            const end = new Date(c.completion_date);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
          }
          return sum;
        }, 0) / templateChecklists.length
      : 0;

    return {
      templateName: template.name,
      usageCount: templateChecklists.length,
      averageCompletionTime: Math.round(avgTime)
    };
  }).filter(template => template.usageCount > 0);

  return {
    totalPreparations: total,
    completedPreparations: completed,
    inProgressPreparations: inProgress,
    pendingPreparations: pending,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    averageCompletionTime: Math.round(averageCompletionTime),
    anomaliesCount,
    statusDistribution,
    monthlyTrend,
    technicianPerformance,
    boatPreparationStats: boatStats,
    templateUsage
  };
}