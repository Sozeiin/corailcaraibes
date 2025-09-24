import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMemo } from 'react';
import { Ship, Clock, AlertTriangle, Plus, User } from 'lucide-react';

export const BoatFlowWidget = ({ config }: WidgetProps) => {
  const { user } = useAuth();
  const dashboardData = useDashboardData();

  const flowData = useMemo(() => {
    if (dashboardData.loading) return null;

    const { boats } = dashboardData;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Simulate returning boats and preparation orders based on boat status
    const returningBoats = boats.filter(b => b.status === 'rented').length;
    const preparationsInProgress = boats.filter(b => b.status === 'maintenance').length;
    const readyBoats = boats.filter(b => b.status === 'available').length;
    const overduePreparations = boats.filter(b => 
      b.status === 'maintenance' && b.next_maintenance && new Date(b.next_maintenance) < today
    ).length;

    return {
      returningBoats,
      preparationsInProgress,
      readyBoats,
      overduePreparations,
      totalBoats: boats.length
    };
  }, [dashboardData]);

  const getUrgencyColor = (count: number, type: 'overdue' | 'normal') => {
    if (type === 'overdue' && count > 0) return 'destructive';
    if (count > 5) return 'secondary';
    return 'default';
  };

  if (!flowData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Ship className="h-4 w-4" />
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
          <Ship className="h-4 w-4" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Retours location</span>
              <Badge variant={getUrgencyColor(flowData.returningBoats, 'normal')}>
                {flowData.returningBoats}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Préparations</span>
              <Badge variant={getUrgencyColor(flowData.preparationsInProgress, 'normal')}>
                {flowData.preparationsInProgress}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prêts</span>
              <Badge variant="outline" className="text-green-600">
                {flowData.readyBoats}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                En retard
              </span>
              <Badge variant={getUrgencyColor(flowData.overduePreparations, 'overdue')}>
                {flowData.overduePreparations}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Taux de disponibilité</span>
            <span className="font-bold">
              {Math.round((flowData.readyBoats / flowData.totalBoats) * 100)}%
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 h-8">
              <Plus className="h-3 w-3 mr-1" />
              Ordre prépa
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-8">
              <User className="h-3 w-3 mr-1" />
              Assigner
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};