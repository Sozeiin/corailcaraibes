import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Calendar,
  PieChart,
  LineChart,
  Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function PurchasingAnalytics() {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('spending');

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['purchasing-analytics', timeRange],
    queryFn: async () => {
      // Get orders data for analysis
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          suppliers(name, category),
          bases(name),
          order_items(*)
        `)
        .order('created_at', { ascending: false });

      // Get suppliers data
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('*');

      // Calculate analytics
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyData = ordersData?.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }) || [];

      const previousMonthData = ordersData?.filter(order => {
        const orderDate = new Date(order.created_at);
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return orderDate.getMonth() === prevMonth && orderDate.getFullYear() === prevYear;
      }) || [];

      const totalSpending = monthlyData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const previousSpending = previousMonthData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const spendingGrowth = previousSpending > 0 ? ((totalSpending - previousSpending) / previousSpending) * 100 : 0;

      // Supplier analysis
      const supplierSpending = monthlyData.reduce((acc, order) => {
        const supplierId = order.supplier_id;
        if (supplierId) {
          acc[supplierId] = (acc[supplierId] || 0) + (order.total_amount || 0);
        }
        return acc;
      }, {} as Record<string, number>);

      const topSuppliers = Object.entries(supplierSpending)
        .map(([id, amount]) => ({
          id,
          name: suppliersData?.find(s => s.id === id)?.name || 'Unknown',
          amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Category analysis
      const categorySpending = monthlyData.reduce((acc, order) => {
        const category = order.suppliers?.category || 'Non catégorisé';
        acc[category] = (acc[category] || 0) + (order.total_amount || 0);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalSpending,
        spendingGrowth,
        ordersCount: monthlyData.length,
        avgOrderValue: monthlyData.length > 0 ? totalSpending / monthlyData.length : 0,
        topSuppliers,
        categorySpending,
        monthlyOrders: monthlyData,
        supplierCount: suppliersData?.length || 0
      };
    }
  });

  const kpis = [
    {
      title: 'Dépenses Totales',
      value: formatCurrency(analyticsData?.totalSpending || 0),
      change: analyticsData?.spendingGrowth || 0,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Commandes',
      value: analyticsData?.ordersCount || 0,
      change: 12,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Valeur Moyenne',
      value: formatCurrency(analyticsData?.avgOrderValue || 0),
      change: -5,
      icon: BarChart3,
      color: 'text-purple-600'
    },
    {
      title: 'Fournisseurs Actifs',
      value: analyticsData?.supplierCount || 0,
      change: 8,
      icon: Users,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics Achats</h2>
          <p className="text-muted-foreground">
            Analyse des performances et tendances d'achat
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className={`flex items-center text-sm font-medium ${
                  kpi.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Évolution des Dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Graphique des dépenses</p>
                    <p className="text-sm text-gray-400">Intégration Recharts en cours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition des Commandes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Graphique en secteurs</p>
                    <p className="text-sm text-gray-400">Répartition par statut</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Fournisseurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : analyticsData?.topSuppliers.map((supplier, index) => (
                  <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Fournisseur #{supplier.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(supplier.amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        {((supplier.amount / (analyticsData?.totalSpending || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dépenses par Catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.categorySpending && Object.entries(analyticsData.categorySpending).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{category}</div>
                        <div className="text-sm text-muted-foreground">Catégorie de produits</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        {((amount / (analyticsData?.totalSpending || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Tendances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Tendances Positives</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Réduction des coûts de transport</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Amélioration des délais de livraison</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Augmentation des achats groupés</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Points d'Attention</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Augmentation du coût unitaire</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Dépendance à un fournisseur unique</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Retards de livraison récurrents</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}