import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMemo } from 'react';
import { AlertTriangle, Wrench, Calendar, ExternalLink } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export const MaintenanceAlertsWidget = ({ config }: WidgetProps) => {
  const { user } = useAuth();
  const dashboardData = useDashboardData();

  const alerts = useMemo(() => {
    if (dashboardData.loading) return [];

    const { boats } = dashboardData;
    const today = new Date();
    
    return boats
      .filter(boat => boat.next_maintenance)
      .map(boat => {
        const nextMaintenance = parseISO(boat.next_maintenance);
        const daysUntil = differenceInDays(nextMaintenance, today);
        
        let priority: 'critical' | 'warning' | 'info' = 'info';
        if (daysUntil < 0) priority = 'critical';
        else if (daysUntil <= 7) priority = 'warning';
        
        return {
          id: boat.id,
          boatName: boat.name,
          daysUntil,
          priority,
          nextMaintenance: boat.next_maintenance,
          engineHours: boat.current_engine_hours || 0,
          lastOilChange: boat.last_oil_change_hours || 0
        };
      })
      .filter(alert => alert.priority !== 'info' || alert.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 4);
  }, [dashboardData]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityText = (daysUntil: number) => {
    if (daysUntil < 0) return `Dépassé de ${Math.abs(daysUntil)}j`;
    if (daysUntil === 0) return "Aujourd'hui";
    return `Dans ${daysUntil}j`;
  };

  if (dashboardData.loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {config.title}
          </CardTitle>
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
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {config.title}
          <Badge variant="outline" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Aucune alerte maintenance urgente
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg border">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{alert.boatName}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.engineHours}h • Vidange: {alert.lastOilChange}h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <Badge variant={getPriorityBadge(alert.priority)}>
                    {getPriorityText(alert.daysUntil)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {new Date(alert.nextMaintenance).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
        
        {alerts.filter(a => a.priority === 'critical').length > 0 && (
          <div className="border-t pt-3">
            <Button size="sm" className="w-full" variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Planifier {alerts.filter(a => a.priority === 'critical').length} intervention(s) urgente(s)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};