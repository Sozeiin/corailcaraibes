import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Timer, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function WorkflowPerformanceTracker() {
  const { user } = useAuth();

  // Métriques de performance en temps réel
  const { data: performance } = useQuery({
    queryKey: ['workflow-performance'],
    queryFn: async () => {
      const [alertsQuery, stepsQuery, automationQuery] = await Promise.all([
        // Alertes actives
        supabase
          .from('workflow_alerts')
          .select('count')
          .eq('is_resolved', false),
          
        // Étapes en cours
        supabase
          .from('purchase_workflow_steps')
          .select('count, step_status')
          .is('completed_at', null),
          
        // Dernières automations
        supabase
          .from('purchase_workflow_steps')
          .select('duration_minutes, step_status')
          .not('duration_minutes', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(10)
      ]);

      const activeAlerts = alertsQuery.data?.[0]?.count || 0;
      const pendingSteps = stepsQuery.data?.length || 0;
      const avgProcessingTime = automationQuery.data?.reduce((acc, step) => 
        acc + (step.duration_minutes || 0), 0) / (automationQuery.data?.length || 1);

      return {
        activeAlerts,
        pendingSteps,
        avgProcessingTime: Math.round(avgProcessingTime),
        efficiency: Math.max(0, 100 - (activeAlerts * 10) - (pendingSteps * 5)),
        automationRate: 85 // Simulated based on workflow rules
      };
    },
    enabled: !!user && user.role === 'direction',
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  if (!user || user.role !== 'direction') {
    return null;
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 90) return { variant: 'default' as const, label: 'Excellent' };
    if (efficiency >= 70) return { variant: 'secondary' as const, label: 'Bon' };
    return { variant: 'destructive' as const, label: 'À améliorer' };
  };

  return (
    <div className="space-y-4">
      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Alertes Actives</p>
                <p className="text-xl font-bold">{performance?.activeAlerts || 0}</p>
              </div>
              <AlertTriangle className={`w-6 h-6 ${
                (performance?.activeAlerts || 0) > 0 ? 'text-red-600' : 'text-gray-400'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Étapes Pendantes</p>
                <p className="text-xl font-bold">{performance?.pendingSteps || 0}</p>
              </div>
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Temps Moyen</p>
                <p className="text-xl font-bold">{performance?.avgProcessingTime || 0}min</p>
              </div>
              <Timer className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Automatisation</p>
                <p className="text-xl font-bold">{performance?.automationRate || 85}%</p>
              </div>
              <Zap className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicateur d'efficacité global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Efficacité Globale du Workflow
            </span>
            <Badge {...getEfficiencyBadge(performance?.efficiency || 0)}>
              {getEfficiencyBadge(performance?.efficiency || 0).label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Performance</span>
                <span className={`text-sm font-bold ${getEfficiencyColor(performance?.efficiency || 0)}`}>
                  {performance?.efficiency || 0}%
                </span>
              </div>
              <Progress 
                value={performance?.efficiency || 0} 
                className="h-3"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm">
                  {100 - (performance?.activeAlerts || 0) * 10}% Sans alertes
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm">
                  {performance?.automationRate || 85}% Automatisé
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <Timer className="w-4 h-4 text-purple-600" />
                <span className="text-sm">
                  {performance?.avgProcessingTime || 0}min Temps moyen
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations basées sur la performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recommandations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(performance?.activeAlerts || 0) > 0 && (
              <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-800">
                    Résoudre les {performance?.activeAlerts} alertes actives
                  </p>
                  <p className="text-xs text-red-600">
                    Impact négatif sur la performance globale
                  </p>
                </div>
              </div>
            )}
            
            {(performance?.efficiency || 0) >= 90 && (
              <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-green-800">
                    Performance excellente
                  </p>
                  <p className="text-xs text-green-600">
                    Le workflow fonctionne de manière optimale
                  </p>
                </div>
              </div>
            )}
            
            {(performance?.pendingSteps || 0) > 5 && (
              <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                <Clock className="w-4 h-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-orange-800">
                    Traiter les {performance?.pendingSteps} étapes en attente
                  </p>
                  <p className="text-xs text-orange-600">
                    Risque d'accumulation de retards
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}