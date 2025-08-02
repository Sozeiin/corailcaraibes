import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Target,
  Brain,
  Zap,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface StockPredictiveAnalysisProps {
  baseId?: string;
  category?: string;
}

export function StockPredictiveAnalysis({ baseId, category }: StockPredictiveAnalysisProps) {
  // Fetch data for predictive analysis
  const { data: predictiveData, isLoading } = useQuery({
    queryKey: ['predictive-analysis', baseId, category],
    queryFn: async () => {
      // Get historical usage data
      let usageQuery = supabase
        .from('intervention_parts')
        .select(`
          *,
          stock_items!inner(id, name, category, quantity, min_threshold, base_id)
        `)
        .gte('used_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (baseId) {
        usageQuery = usageQuery.eq('stock_items.base_id', baseId);
      }
      if (category) {
        usageQuery = usageQuery.eq('stock_items.category', category);
      }

      const { data: usageData, error: usageError } = await usageQuery;
      if (usageError) throw usageError;

      // Get current stock levels
      let stockQuery = supabase
        .from('stock_items')
        .select('*');

      if (baseId) {
        stockQuery = stockQuery.eq('base_id', baseId);
      }
      if (category) {
        stockQuery = stockQuery.eq('category', category);
      }

      const { data: stockData, error: stockError } = await stockQuery;
      if (stockError) throw stockError;

      // Calculate predictions for each stock item
      const predictions = stockData.map(item => {
        // Get usage history for this item
        const itemUsage = usageData.filter(usage => usage.stock_item_id === item.id);
        
        // Calculate usage patterns
        const dailyUsage = itemUsage.reduce((acc: any, usage: any) => {
          const date = new Date(usage.used_at).toDateString();
          if (!acc[date]) acc[date] = 0;
          acc[date] += usage.quantity;
          return acc;
        }, {});

        const usageDays = Object.keys(dailyUsage).length;
        const totalUsage = Object.values(dailyUsage).reduce((sum: number, qty: any) => sum + qty, 0);
        const avgDailyUsage = usageDays > 0 ? totalUsage / usageDays : 0;

        // Calculate trend (simple linear regression slope)
        const sortedDates = Object.keys(dailyUsage).sort();
        let trend = 0;
        if (sortedDates.length > 1) {
          const x = sortedDates.map((_, i) => i);
          const y = sortedDates.map(date => dailyUsage[date]);
          const n = x.length;
          const sumX = x.reduce((a, b) => a + b, 0);
          const sumY = y.reduce((a, b) => a + b, 0);
          const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
          const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
          
          trend = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
        }

        // Predict stock out date
        const currentStock = item.quantity || 0;
        const adjustedUsage = Math.max(avgDailyUsage + trend, 0.1); // Ensure positive usage
        const daysUntilStockOut = adjustedUsage > 0 ? currentStock / adjustedUsage : 999;
        
        // Calculate reorder point (consider lead time and safety stock)
        const leadTimeDays = 7; // Assume 7 days average lead time
        const safetyStockDays = 3; // 3 days safety stock
        const reorderPoint = adjustedUsage * (leadTimeDays + safetyStockDays);
        
        // Determine urgency level
        let urgency = 'low';
        let urgencyScore = 0;
        
        if (daysUntilStockOut <= 7) {
          urgency = 'critical';
          urgencyScore = 100;
        } else if (daysUntilStockOut <= 14) {
          urgency = 'high';
          urgencyScore = 75;
        } else if (daysUntilStockOut <= 30) {
          urgency = 'medium';
          urgencyScore = 50;
        } else {
          urgencyScore = 25;
        }

        // Generate prediction confidence based on data quality
        const confidence = Math.min(95, 40 + (usageDays * 2) + (itemUsage.length * 0.5));

        return {
          ...item,
          avgDailyUsage,
          trend,
          daysUntilStockOut: Math.max(0, daysUntilStockOut),
          reorderPoint,
          urgency,
          urgencyScore,
          confidence,
          recommendedOrderQuantity: Math.ceil(adjustedUsage * 30), // 30 days supply
          usageVariability: usageDays > 1 ? this.calculateVariability(Object.values(dailyUsage)) : 0
        };
      });

      return predictions.sort((a, b) => a.daysUntilStockOut - b.daysUntilStockOut);
    },
  });

  // Helper function to calculate variability
  const calculateVariability = (values: number[]) => {
    if (values.length <= 1) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Critique</Badge>;
      case 'high':
        return <Badge variant="destructive">Élevée</Badge>;
      case 'medium':
        return <Badge variant="secondary">Moyenne</Badge>;
      default:
        return <Badge variant="outline">Faible</Badge>;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return <OptimizedSkeleton type="grid" count={6} />;
  }

  const criticalItems = predictiveData?.filter(item => item.urgency === 'critical').length || 0;
  const highUrgencyItems = predictiveData?.filter(item => item.urgency === 'high').length || 0;
  const avgConfidence = predictiveData?.length > 0 
    ? predictiveData.reduce((sum, item) => sum + item.confidence, 0) / predictiveData.length 
    : 0;

  // Prepare chart data for stock evolution prediction
  const chartData = predictiveData?.slice(0, 5).map(item => {
    const dates = [];
    const currentDate = new Date();
    for (let i = 0; i <= 30; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);
      const predictedStock = Math.max(0, item.quantity - (item.avgDailyUsage * i));
      dates.push({
        day: i,
        date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        [item.name]: predictedStock,
        reorderPoint: item.reorderPoint
      });
    }
    return dates;
  }).flat();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Articles Critiques</p>
                <p className="text-2xl font-bold text-destructive">{criticalItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgence Élevée</p>
                <p className="text-2xl font-bold text-orange-600">{highUrgencyItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confiance Moyenne</p>
                <p className="text-2xl font-bold">{avgConfidence.toFixed(0)}%</p>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IA Activée</p>
                <p className="text-lg font-bold text-green-600">Optimisé</p>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Evolution Prediction Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Prédiction d'Évolution du Stock (30 jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {predictiveData?.slice(0, 3).map((item, index) => (
                <Line
                  key={item.id}
                  type="monotone"
                  dataKey={item.name}
                  stroke={`hsl(${index * 120}, 70%, 50%)`}
                  strokeWidth={2}
                />
              ))}
              <ReferenceLine y={0} stroke="red" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Predictive Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analyse Prédictive des Stocks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Stock Actuel</TableHead>
                <TableHead>Usage Moyen/Jour</TableHead>
                <TableHead>Jours Restants</TableHead>
                <TableHead>Urgence</TableHead>
                <TableHead>Point de Commande</TableHead>
                <TableHead>Qté Recommandée</TableHead>
                <TableHead>Confiance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictiveData?.slice(0, 20).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{item.quantity}</span>
                      <div className="w-16">
                        <Progress 
                          value={Math.min(100, (item.quantity / Math.max(item.reorderPoint, 1)) * 100)} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <span>{item.avgDailyUsage.toFixed(1)}</span>
                      {item.trend > 0 && <TrendingUp className="h-3 w-3 text-red-500" />}
                      {item.trend < 0 && <TrendingUp className="h-3 w-3 text-green-500 rotate-180" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={item.daysUntilStockOut <= 7 ? 'text-destructive font-bold' : ''}>
                        {item.daysUntilStockOut === 999 ? '∞' : Math.round(item.daysUntilStockOut)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getUrgencyBadge(item.urgency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{Math.round(item.reorderPoint)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.recommendedOrderQuantity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-12">
                        <Progress value={item.confidence} className="h-2" />
                      </div>
                      <span className={`text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
                        {Math.round(item.confidence)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}