import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, CheckCircle } from 'lucide-react';

export const StatisticsWidget = ({ config }: WidgetProps) => {
  const { user } = useAuth();
  const interventions = useOfflineData<any>({ table: 'interventions' });
  const boats = useOfflineData<any>({ table: 'boats' });
  const alerts = useOfflineData<any>({ table: 'alerts' });
  const bases = useOfflineData<any>({ table: 'bases' });

  const stats = useMemo(() => {
    if (interventions.loading || boats.loading || alerts.loading) return null;

    const interventionsData = interventions.data || [];
    const boatsData = boats.data || [];
    const alertsData = alerts.data || [];

    if (user?.role === 'technicien') {
      const myInterventions = interventionsData.filter(i => i.technician_id === user.id);
      const completed = myInterventions.filter(i => i.status === 'completed').length;
      const pending = myInterventions.filter(i => i.status === 'scheduled').length;
      
      return [
        {
          title: 'Mes Interventions',
          value: myInterventions.length,
          change: '+12%',
          trend: 'up',
          icon: Activity,
        },
        {
          title: 'Terminées',
          value: completed,
          change: `${Math.round((completed / myInterventions.length) * 100)}%`,
          trend: 'up',
          icon: CheckCircle,
        },
        {
          title: 'En Attente',
          value: pending,
          change: '-5%',
          trend: 'down',
          icon: TrendingDown,
        },
      ];
    } else if (user?.role === 'chef_base') {
      const baseInterventions = interventionsData.filter(i => i.base_id === user.baseId);
      const baseBoats = boatsData.filter(b => b.base_id === user.baseId);
      const baseAlerts = alertsData.filter(a => a.base_id === user.baseId);
      
      return [
        {
          title: 'Interventions',
          value: baseInterventions.length,
          change: '+8%',
          trend: 'up',
          icon: Activity,
        },
        {
          title: 'Bateaux',
          value: baseBoats.length,
          change: '+2%',
          trend: 'up',
          icon: CheckCircle,
        },
        {
          title: 'Alertes',
          value: baseAlerts.filter(a => !a.is_read).length,
          change: '-15%',
          trend: 'down',
          icon: TrendingDown,
        },
      ];
    } else { // direction
      return [
        {
          title: 'Total Interventions',
          value: interventionsData.length,
          change: '+15%',
          trend: 'up',
          icon: Activity,
        },
        {
          title: 'Total Bateaux',
          value: boatsData.length,
          change: '+3%',
          trend: 'up',
          icon: CheckCircle,
        },
        {
          title: 'Bases Actives',
          value: bases.data?.length || 0,
          change: '0%',
          trend: 'up',
          icon: TrendingUp,
        },
      ];
    }
  }, [interventions.data, boats.data, alerts.data, bases.data, user]);

  if (!stats) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{stat.title}</p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{stat.value}</p>
              {stat.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500 inline" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 inline" />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};