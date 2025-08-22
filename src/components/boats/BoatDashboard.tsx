import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Wrench, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Cog
} from 'lucide-react';
import { EngineStatusCard } from './EngineStatusCard';

interface BoatDashboardProps {
  boatId: string;
  boatName: string;
}

export const BoatDashboard = ({ boatId, boatName }: BoatDashboardProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['boat-dashboard', boatId],
    queryFn: async () => {
      // Get interventions count
      const { data: interventions } = await supabase
        .from('interventions')
        .select('id, status, created_at')
        .eq('boat_id', boatId);

      // Get components count including engine data
      const { data: components } = await supabase
        .from('boat_components')
        .select('id, status, next_maintenance_date, component_type, component_name, current_engine_hours, last_oil_change_hours')
        .eq('boat_id', boatId);

      // Get scheduled maintenance
      const { data: scheduledMaintenance } = await supabase
        .from('scheduled_maintenance')
        .select('id, status, scheduled_date')
        .eq('boat_id', boatId)
        .eq('status', 'pending');

      const now = new Date();
      const componentsNeedingMaintenance = components?.filter(c => 
        c.next_maintenance_date && new Date(c.next_maintenance_date) <= now
      ) || [];

      const upcomingMaintenance = scheduledMaintenance?.filter(m =>
        new Date(m.scheduled_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ) || [];

      // Get engine components for display
      const engineComponents = components?.filter(c => 
        c.component_type?.toLowerCase().includes('moteur') || 
        c.component_type?.toLowerCase().includes('engine')
      ) || [];

      return {
        totalInterventions: interventions?.length || 0,
        completedInterventions: interventions?.filter(i => i.status === 'completed').length || 0,
        totalComponents: components?.length || 0,
        operationalComponents: components?.filter(c => c.status === 'operational').length || 0,
        componentsNeedingMaintenance: componentsNeedingMaintenance.length,
        upcomingMaintenance: upcomingMaintenance.length,
        lastInterventionDate: interventions?.[0]?.created_at,
        engineComponents
      };
    }
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  const maintenanceCompletion = stats?.totalComponents ? 
    ((stats.operationalComponents / stats.totalComponents) * 100) : 0;

  return (
    <div className="grid gap-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInterventions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.completedInterventions || 0} terminées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Composants</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalComponents || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.operationalComponents || 0} opérationnels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance due</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.componentsNeedingMaintenance || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Composants à maintenir
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À venir</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingMaintenance || 0}</div>
            <p className="text-xs text-muted-foreground">
              Maintenance prochaine
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              État des composants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Composants opérationnels</span>
                <span>{maintenanceCompletion.toFixed(0)}%</span>
              </div>
              <Progress value={maintenanceCompletion} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Opérationnels: {stats?.operationalComponents || 0}</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>À maintenir: {stats?.componentsNeedingMaintenance || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Dernière activité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.lastInterventionDate ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Dernière intervention
                </p>
                <p className="text-lg">
                  {new Date(stats.lastInterventionDate).toLocaleDateString()}
                </p>
                <Badge variant="outline">
                  {Math.floor((Date.now() - new Date(stats.lastInterventionDate).getTime()) / (1000 * 60 * 60 * 24))} jours
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">Aucune intervention enregistrée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engine Status */}
      {stats?.engineComponents && stats.engineComponents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cog className="h-5 w-5 mr-2" />
              État des moteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {stats.engineComponents.map((engine: any) => (
                <EngineStatusCard key={engine.id} engine={engine} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {(stats?.componentsNeedingMaintenance || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Actions requises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="font-medium">Maintenance en retard</p>
                <p className="text-sm text-muted-foreground">
                  {stats?.componentsNeedingMaintenance} composant(s) nécessitent une maintenance
                </p>
              </div>
              <Badge variant="destructive">
                Action requise
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};