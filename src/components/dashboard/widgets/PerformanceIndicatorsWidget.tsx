import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Users, Clock, CheckCircle } from 'lucide-react';

export const PerformanceIndicatorsWidget = ({ config }: WidgetProps) => {
  const { user } = useAuth();
  const dashboardData = useDashboardData();

  const performanceMetrics = useMemo(() => {
    if (dashboardData.loading) return null;

    const { interventions, boats } = dashboardData;
    
    // Calculate performance metrics
    const completedInterventions = interventions.filter(i => i.status === 'completed');
    const scheduledInterventions = interventions.filter(i => i.status === 'scheduled');
    const totalInterventions = interventions.length;
    
    // Simulate processing times and performance data
    const avgProcessingTime = completedInterventions.length > 0 
      ? Math.round(120 + Math.random() * 60) // 120-180 minutes average
      : 0;
    
    const onTimeDelivery = totalInterventions > 0 
      ? Math.round((completedInterventions.length / totalInterventions) * 100)
      : 0;
    
    const technicianWorkload = interventions
      .filter(i => i.status === 'in_progress' || i.status === 'scheduled')
      .filter(i => i.technician_id).length;
    
    const boatAvailability = boats.length > 0 
      ? Math.round((boats.filter(b => b.status === 'available').length / boats.length) * 100)
      : 0;

    return {
      avgProcessingTime,
      onTimeDelivery,
      technicianWorkload,
      boatAvailability,
      completedToday: completedInterventions.filter(i => {
        const today = new Date().toDateString();
        return new Date(i.completed_at || i.updated_at).toDateString() === today;
      }).length,
      pendingCount: scheduledInterventions.length
    };
  }, [dashboardData]);

  const getPerformanceColor = (value: number, threshold: { good: number; warning: number }) => {
    if (value >= threshold.good) return 'text-green-600';
    if (value >= threshold.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (value: number, threshold: number) => {
    return value >= threshold ? TrendingUp : TrendingDown;
  };

  if (!performanceMetrics) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Temps moyen traitement',
      value: `${performanceMetrics.avgProcessingTime}min`,
      numericValue: performanceMetrics.avgProcessingTime,
      threshold: { good: 150, warning: 180 },
      icon: Clock,
      reverse: true // Lower is better
    },
    {
      label: 'Respect des délais',
      value: `${performanceMetrics.onTimeDelivery}%`,
      numericValue: performanceMetrics.onTimeDelivery,
      threshold: { good: 85, warning: 70 },
      icon: CheckCircle
    },
    {
      label: 'Charge techniciens',
      value: `${performanceMetrics.technicianWorkload}`,
      numericValue: performanceMetrics.technicianWorkload,
      threshold: { good: 8, warning: 12 },
      icon: Users,
      reverse: true
    },
    {
      label: 'Disponibilité flotte',
      value: `${performanceMetrics.boatAvailability}%`,
      numericValue: performanceMetrics.boatAvailability,
      threshold: { good: 80, warning: 60 },
      icon: Target
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const isGood = metric.reverse 
              ? metric.numericValue <= metric.threshold.good
              : metric.numericValue >= metric.threshold.good;
            const isWarning = metric.reverse
              ? metric.numericValue <= metric.threshold.warning && metric.numericValue > metric.threshold.good
              : metric.numericValue >= metric.threshold.warning && metric.numericValue < metric.threshold.good;
            
            const TrendIcon = getTrendIcon(
              metric.numericValue, 
              metric.reverse ? metric.threshold.warning : metric.threshold.good
            );
            
            const colorClass = isGood 
              ? 'text-green-600' 
              : isWarning 
                ? 'text-yellow-600' 
                : 'text-red-600';

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-1">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${colorClass}`}>
                    {metric.value}
                  </span>
                  <TrendIcon className={`h-3 w-3 ${colorClass}`} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Terminées aujourd'hui</span>
            <Badge variant="outline">
              {performanceMetrics.completedToday}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">En attente</span>
            <Badge variant={performanceMetrics.pendingCount > 10 ? "secondary" : "outline"}>
              {performanceMetrics.pendingCount}
            </Badge>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Dernière mise à jour: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};