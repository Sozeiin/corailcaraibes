import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WidgetProps } from '@/types/widget';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateInTimezone, timezoneLabel } from '@/lib/dateUtils';

export const AlertsWidget = ({ config }: WidgetProps) => {
  const dashboardData = useDashboardData();
  const { user } = useAuth();
  const tz = user?.timezone;

  const recentAlerts = useMemo(() => {
    if (dashboardData.loading || !dashboardData.alerts) return [];
    
    return dashboardData.alerts
      .filter(alert => !alert.is_read)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [dashboardData.alerts, dashboardData.loading]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return AlertTriangle;
      case 'warning':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2 flex-wrap">
            {config.title}
            <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary border-primary/20">
              🕐 heure {timezoneLabel(tz)}
            </Badge>
          </span>
          <Badge variant="secondary" className="text-xs">
            {recentAlerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentAlerts.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Aucune alerte récente
          </div>
        ) : (
          recentAlerts.map((alert) => {
            const Icon = getSeverityIcon(alert.severity);
            return (
              <div key={alert.id} className="flex items-start space-x-3 p-2 rounded-lg border bg-card/50">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium truncate">{alert.title}</h4>
                    <Badge variant={getSeverityColor(alert.severity) as any} className="text-xs ml-2">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {alert.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateInTimezone(alert.created_at, tz, 'dd/MM HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};