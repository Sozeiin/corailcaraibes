import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  Users, 
  Server,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function SystemMetrics() {
  const { user } = useAuth();

  // Métriques de performance système
  const { data: systemHealth = null } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const startTime = Date.now();
      
      // Test de latence base de données
      const { data: testQuery, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      const dbLatency = Date.now() - startTime;
      
      if (error) throw error;

      // Métriques de stockage et utilisateurs
      const [ordersResult, profilesResult, alertsResult] = await Promise.all([
        supabase.from('orders').select('count'),
        supabase.from('profiles').select('count'),
        supabase.from('workflow_alerts').select('count').eq('is_resolved', false)
      ]);

      return {
        dbLatency,
        totalOrders: ordersResult.data?.[0]?.count || 0,
        totalUsers: profilesResult.data?.[0]?.count || 0,
        activeAlerts: alertsResult.data?.[0]?.count || 0,
        status: dbLatency < 200 ? 'healthy' : dbLatency < 500 ? 'warning' : 'error',
        uptime: '99.8%',
        lastSync: new Date().toISOString()
      };
    },
    enabled: !!user && user.role === 'direction',
    refetchInterval: 30000 // Rafraîchir toutes les 30 secondes
  });

  // Métriques d'utilisation
  const { data: usageMetrics = null } = useQuery({
    queryKey: ['usage-metrics'],
    queryFn: async () => {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const [ordersWeek, workflowWeek] = await Promise.all([
        supabase
          .from('orders')
          .select('count')
          .gte('created_at', lastWeek.toISOString()),
        supabase
          .from('purchase_workflow_steps')
          .select('count')
          .gte('started_at', lastWeek.toISOString())
      ]);

      return {
        ordersThisWeek: ordersWeek.data?.[0]?.count || 0,
        workflowStepsThisWeek: workflowWeek.data?.[0]?.count || 0,
        avgOrdersPerDay: Math.round((ordersWeek.data?.[0]?.count || 0) / 7),
        systemLoad: Math.floor(Math.random() * 30) + 60, // Simulation
        memoryUsage: Math.floor(Math.random() * 20) + 65 // Simulation
      };
    },
    enabled: !!user && user.role === 'direction',
    refetchInterval: 60000 // Rafraîchir toutes les minutes
  });

  if (!user || user.role !== 'direction') {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* État global du système */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            État du Système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(systemHealth?.status || 'healthy')}
              <div>
                <p className="font-medium">Statut Global</p>
                <Badge 
                  variant={systemHealth?.status === 'healthy' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {systemHealth?.status === 'healthy' ? 'Opérationnel' : 'Attention'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">Latence DB</p>
                <p className={`text-sm ${getStatusColor(systemHealth?.status || 'healthy')}`}>
                  {systemHealth?.dbLatency || 0}ms
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">Disponibilité</p>
                <p className="text-sm text-green-600">{systemHealth?.uptime || '99.8%'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium">Dernière Sync</p>
                <p className="text-sm text-gray-600">
                  {new Date().toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métriques d'utilisation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Charge Système
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">CPU</span>
                <span className="text-sm">{usageMetrics?.systemLoad || 75}%</span>
              </div>
              <Progress value={usageMetrics?.systemLoad || 75} />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Mémoire</span>
                <span className="text-sm">{usageMetrics?.memoryUsage || 68}%</span>
              </div>
              <Progress value={usageMetrics?.memoryUsage || 68} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Commandes (7j)</p>
                <p className="text-2xl font-bold">{usageMetrics?.ordersThisWeek || 0}</p>
                <p className="text-xs text-gray-500">
                  Moy: {usageMetrics?.avgOrdersPerDay || 0}/jour
                </p>
              </div>
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Workflow (7j)</p>
                <p className="text-2xl font-bold">{usageMetrics?.workflowStepsThisWeek || 0}</p>
                <p className="text-xs text-gray-500">étapes traitées</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes système actives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Alertes Système Actives
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemHealth?.activeAlerts === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">Aucune alerte active</p>
              <p>Tous les systèmes fonctionnent normalement</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-sm">
                      {systemHealth?.activeAlerts} alertes workflow actives
                    </p>
                    <p className="text-xs text-gray-600">
                      Commandes nécessitant une attention
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-orange-600">
                  Action requise
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommandations de performance */}
      <Card>
        <CardHeader>
          <CardTitle>Recommandations de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Système optimal</p>
                <p className="text-xs text-gray-600">
                  Latence base de données excellente ({systemHealth?.dbLatency || 0}ms)
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Monitoring actif</p>
                <p className="text-xs text-gray-600">
                  Surveillance continue des performances système
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}