import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Calendar, Clock, Wrench } from 'lucide-react';
import { useMemo } from 'react';

export const MaintenanceWidget = ({ config }: WidgetProps) => {
  const { user } = useAuth();
  const dashboardData = useDashboardData();

  const upcomingMaintenance = useMemo(() => {
    if (dashboardData.loading || !dashboardData.interventions || !dashboardData.boats) return [];
    
    const { interventions, boats } = dashboardData;
    
    let filteredInterventions = interventions;
    
    // Filter based on user role
    if (user?.role === 'technicien') {
      filteredInterventions = interventions.filter(i => i.technician_id === user.id);
    } else if (user?.role === 'chef_base') {
      filteredInterventions = interventions.filter(i => i.base_id === user.baseId);
    }
    
    return filteredInterventions
      .filter(intervention => 
        intervention.status === 'scheduled' && 
        intervention.scheduled_date
      )
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      .slice(0, 5)
      .map(intervention => {
        const boat = boats.find(b => b.id === intervention.boat_id);
        return { ...intervention, boat };
      });
  }, [dashboardData.interventions, dashboardData.boats, dashboardData.loading, user]);

  const getStatusColor = (date: string) => {
    const today = new Date();
    const scheduledDate = new Date(date);
    const diffDays = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return 'destructive';
    if (diffDays <= 3) return 'secondary';
    return 'outline';
  };

  const formatRelativeDate = (date: string) => {
    const today = new Date();
    const scheduledDate = new Date(date);
    const diffDays = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return `En retard de ${Math.abs(diffDays)} jour(s)`;
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Demain";
    return `Dans ${diffDays} jour(s)`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center justify-between">
          {config.title}
          <Badge variant="secondary" className="text-xs">
            {upcomingMaintenance.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingMaintenance.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Aucune maintenance prévue
          </div>
        ) : (
          upcomingMaintenance.map((maintenance) => (
            <div key={maintenance.id} className="flex items-start space-x-3 p-2 rounded-lg border bg-card/50">
              <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium truncate">{maintenance.title}</h4>
                  <Badge variant={getStatusColor(maintenance.scheduled_date) as any} className="text-xs ml-2">
                    {formatRelativeDate(maintenance.scheduled_date)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {maintenance.boat?.name || 'Bateau non spécifié'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(maintenance.scheduled_date).toLocaleDateString('fr-FR')}
                  </span>
                  {maintenance.scheduled_time && (
                    <>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {maintenance.scheduled_time}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};