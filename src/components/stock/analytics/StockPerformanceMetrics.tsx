import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  DollarSign,
  BarChart3,
  Activity,
  Clock
} from 'lucide-react';

interface StockMetrics {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  avgCost: number;
  stockTurnover?: number;
  avgLeadTime?: number;
  stockAccuracy?: number;
  topMovingItems?: Array<{
    name: string;
    quantity_used: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  recentActivities?: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface StockPerformanceMetricsProps {
  metrics?: StockMetrics;
  isLoading?: boolean;
  timeRange: string;
  detailed?: boolean;
}

export function StockPerformanceMetrics({ 
  metrics, 
  isLoading, 
  timeRange, 
  detailed = false 
}: StockPerformanceMetricsProps) {
  if (isLoading) {
    return <OptimizedSkeleton type="grid" count={detailed ? 8 : 4} />;
  }

  const getStockHealthColor = (percentage: number) => {
    if (percentage < 10) return 'text-destructive';
    if (percentage < 25) return 'text-warning';
    return 'text-success';
  };

  const lowStockPercentage = metrics?.totalItems 
    ? Math.round((metrics.lowStockItems / metrics.totalItems) * 100) 
    : 0;

  const kpiCards = [
    {
      title: 'Total Articles',
      value: metrics?.totalItems || 0,
      icon: Package,
      description: 'Articles en stock',
      color: 'text-blue-600'
    },
    {
      title: 'Stock Faible',
      value: metrics?.lowStockItems || 0,
      icon: AlertTriangle,
      description: `${lowStockPercentage}% du total`,
      color: getStockHealthColor(lowStockPercentage)
    },
    {
      title: 'Valeur Totale',
      value: `${(metrics?.totalValue || 0).toLocaleString('fr-FR')} €`,
      icon: DollarSign,
      description: 'Valeur du stock',
      color: 'text-green-600'
    },
    {
      title: 'Coût Moyen',
      value: `${(metrics?.avgCost || 0).toFixed(2)} €`,
      icon: BarChart3,
      description: 'Par article',
      color: 'text-purple-600'
    }
  ];

  const detailedKpis = [
    {
      title: 'Rotation Stock',
      value: `${(metrics?.stockTurnover || 0).toFixed(1)}x`,
      icon: Activity,
      description: `Derniers ${timeRange} jours`,
      color: 'text-orange-600'
    },
    {
      title: 'Délai Moyen',
      value: `${metrics?.avgLeadTime || 0} jours`,
      icon: Clock,
      description: 'Livraison',
      color: 'text-indigo-600'
    },
    {
      title: 'Précision Stock',
      value: `${(metrics?.stockAccuracy || 95).toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Exactitude inventaire',
      color: 'text-emerald-600'
    }
  ];

  const allKpis = detailed ? [...kpiCards, ...detailedKpis] : kpiCards;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {allKpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {kpi.title}
                    </p>
                    <p className="text-2xl font-bold">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.description}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Moving Items */}
      {detailed && metrics?.topMovingItems && metrics.topMovingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Articles les Plus Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topMovingItems.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity_used} utilisés
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    item.trend === 'up' ? 'default' : 
                    item.trend === 'down' ? 'destructive' : 'secondary'
                  }>
                    {item.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {item.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {item.trend}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      {detailed && metrics?.recentActivities && metrics.recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activités Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recentActivities.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border-l-2 border-primary/20">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}