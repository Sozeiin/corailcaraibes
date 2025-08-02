import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { StockPerformanceMetrics } from './StockPerformanceMetrics';
import { StockAnalyticsCharts } from './StockAnalyticsCharts';
import { StockInventoryAnalysis } from './StockInventoryAnalysis';
import { StockSupplierAnalysis } from './StockSupplierAnalysis';
import { StockPredictiveAnalysis } from './StockPredictiveAnalysis';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Truck,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface StockAnalyticsDashboardProps {
  baseId?: string;
}

export function StockAnalyticsDashboard({ baseId }: StockAnalyticsDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [selectedBase, setSelectedBase] = useState(baseId || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch bases for filter
  const { data: bases } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch stock categories for filter
  const { data: categories } = useQuery({
    queryKey: ['stock-categories', selectedBase],
    queryFn: async () => {
      let query = supabase
        .from('stock_items')
        .select('category')
        .not('category', 'is', null);
      
      if (selectedBase !== 'all') {
        query = query.eq('base_id', selectedBase);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      return uniqueCategories.filter(Boolean);
    },
  });

  // Fetch key metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['stock-metrics', selectedBase, selectedCategory, selectedTimeRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(selectedTimeRange));

      // Build base query conditions
      let baseCondition = '';
      if (selectedBase !== 'all') {
        baseCondition = `AND si.base_id = '${selectedBase}'`;
      }
      
      let categoryCondition = '';
      if (selectedCategory !== 'all') {
        categoryCondition = `AND si.category = '${selectedCategory}'`;
      }

      // Fetch comprehensive metrics with fallback queries
      let totalItemsQuery = supabase
        .from('stock_items')
        .select('*', { count: 'exact' });
      
      if (selectedBase !== 'all') {
        totalItemsQuery = totalItemsQuery.eq('base_id', selectedBase);
      }
      if (selectedCategory !== 'all') {
        totalItemsQuery = totalItemsQuery.eq('category', selectedCategory);
      }

      const { data: totalItems } = await totalItemsQuery;

      let lowStockQuery = supabase
        .from('stock_items')
        .select('*')
        .filter('quantity', 'lte', 'min_threshold');
      
      if (selectedBase !== 'all') {
        lowStockQuery = lowStockQuery.eq('base_id', selectedBase);
      }
      if (selectedCategory !== 'all') {
        lowStockQuery = lowStockQuery.eq('category', selectedCategory);
      }

      const { data: lowStockItems } = await lowStockQuery;

      return {
        totalItems: totalItems?.length || 0,
        lowStockItems: lowStockItems?.length || 0,
        totalValue: 0,
        avgCost: 0,
        topMovingItems: [],
        recentActivities: []
      };
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchMetrics();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // Implementation for exporting analytics data
    console.log('Exporting analytics data...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytiques du Stock</h2>
          <p className="text-muted-foreground">
            Analyse détaillée et rapports de performance du stock
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Période</label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                  <SelectItem value="365">12 derniers mois</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Base</label>
              <Select value={selectedBase} onValueChange={setSelectedBase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les bases</SelectItem>
                  {bases?.map((base) => (
                    <SelectItem key={base.id} value={base.id}>
                      {base.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Catégorie</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Badge variant={metricsLoading ? "secondary" : "default"} className="whitespace-nowrap">
                {metricsLoading ? 'Chargement...' : `${(metrics as any)?.totalItems || 0} articles`}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Truck className="h-4 w-4 mr-2" />
            Fournisseurs
          </TabsTrigger>
          <TabsTrigger value="predictive">
            <Calendar className="h-4 w-4 mr-2" />
            Prédictif
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <StockPerformanceMetrics 
            metrics={metrics} 
            isLoading={metricsLoading}
            timeRange={selectedTimeRange}
          />
          <StockAnalyticsCharts 
            baseId={selectedBase === 'all' ? undefined : selectedBase}
            category={selectedCategory === 'all' ? undefined : selectedCategory}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <StockPerformanceMetrics 
            metrics={metrics} 
            isLoading={metricsLoading}
            timeRange={selectedTimeRange}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <StockInventoryAnalysis 
            baseId={selectedBase === 'all' ? undefined : selectedBase}
            category={selectedCategory === 'all' ? undefined : selectedCategory}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <StockSupplierAnalysis 
            baseId={selectedBase === 'all' ? undefined : selectedBase}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <StockPredictiveAnalysis 
            baseId={selectedBase === 'all' ? undefined : selectedBase}
            category={selectedCategory === 'all' ? undefined : selectedCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}