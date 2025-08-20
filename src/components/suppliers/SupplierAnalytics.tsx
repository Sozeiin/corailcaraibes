import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Package,
  Star,
  Truck,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface SupplierAnalyticsProps {
  baseId?: string;
  timeRange: string;
}

export function SupplierAnalytics({ baseId, timeRange }: SupplierAnalyticsProps) {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['supplier-analytics', baseId, timeRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Récupérer les commandes avec fournisseurs
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          suppliers!supplier_id(id, name, category),
          order_items(quantity, unit_price)
        `)
        .eq('status', 'delivered')
        .gte('delivery_date', startDate.toISOString().split('T')[0])
        .lte('delivery_date', endDate.toISOString().split('T')[0]);

      if (baseId) {
        ordersQuery = ordersQuery.eq('base_id', baseId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // Récupérer les évaluations des fournisseurs
      let evaluationsQuery = supabase
        .from('supplier_evaluations')
        .select(`
          *,
          suppliers!supplier_id(id, name, category)
        `)
        .gte('evaluation_date', startDate.toISOString().split('T')[0])
        .lte('evaluation_date', endDate.toISOString().split('T')[0]);

      const { data: evaluations, error: evaluationsError } = await evaluationsQuery;
      if (evaluationsError) throw evaluationsError;

      // Analyser les données par fournisseur
      const supplierStats: any = {};
      const monthlyData: any = {};
      const categoryData: any = {};

      // Traiter les commandes
      orders.forEach((order: any) => {
        if (!order.suppliers) return;
        
        const supplierId = order.suppliers.id;
        const orderMonth = new Date(order.delivery_date).toISOString().slice(0, 7);
        const category = order.suppliers.category || 'Non catégorisé';

        // Stats par fournisseur
        if (!supplierStats[supplierId]) {
          supplierStats[supplierId] = {
            id: supplierId,
            name: order.suppliers.name,
            category: order.suppliers.category,
            totalOrders: 0,
            totalValue: 0,
            avgDeliveryTime: 0,
            deliveryTimes: [],
            onTimeDeliveries: 0,
            lastOrderDate: order.delivery_date
          };
        }

        const totalOrderValue = order.order_items.reduce((sum: number, item: any) => 
          sum + (item.quantity * item.unit_price), 0
        );

        supplierStats[supplierId].totalOrders += 1;
        supplierStats[supplierId].totalValue += totalOrderValue;

        // Calculer le temps de livraison
        if (order.order_date && order.delivery_date) {
          const deliveryTime = Math.floor(
            (new Date(order.delivery_date).getTime() - new Date(order.order_date).getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          supplierStats[supplierId].deliveryTimes.push(deliveryTime);
          
          if (deliveryTime <= 14) { // Considéré comme à temps si livré dans les 14 jours
            supplierStats[supplierId].onTimeDeliveries += 1;
          }
        }

        // Données mensuelles
        if (!monthlyData[orderMonth]) {
          monthlyData[orderMonth] = { month: orderMonth, orders: 0, value: 0 };
        }
        monthlyData[orderMonth].orders += 1;
        monthlyData[orderMonth].value += totalOrderValue;

        // Données par catégorie
        if (!categoryData[category]) {
          categoryData[category] = { name: category, value: 0, orders: 0 };
        }
        categoryData[category].value += totalOrderValue;
        categoryData[category].orders += 1;
      });

      // Calculer les moyennes
      Object.values(supplierStats).forEach((supplier: any) => {
        if (supplier.deliveryTimes.length > 0) {
          supplier.avgDeliveryTime = supplier.deliveryTimes.reduce((sum: number, time: number) => sum + time, 0) / supplier.deliveryTimes.length;
        }
        supplier.onTimePercentage = supplier.totalOrders > 0 ? (supplier.onTimeDeliveries / supplier.totalOrders) * 100 : 0;
        supplier.avgOrderValue = supplier.totalOrders > 0 ? supplier.totalValue / supplier.totalOrders : 0;
      });

      // Ajouter les évaluations
      evaluations.forEach((evaluation: any) => {
        if (supplierStats[evaluation.supplier_id]) {
          supplierStats[evaluation.supplier_id].latestEvaluation = evaluation.overall_score;
        }
      });

      const suppliersValues = Object.values(supplierStats);
      const suppliersCount = suppliersValues.length;
      
      // Calculate averages safely
      const totalDeliveryTime = suppliersValues.reduce((sum: number, s: any) => sum + (s.avgDeliveryTime || 0), 0);
      const totalOnTimePercentage = suppliersValues.reduce((sum: number, s: any) => sum + (s.onTimePercentage || 0), 0);
      
      return {
        suppliers: suppliersValues.sort((a: any, b: any) => b.totalValue - a.totalValue),
        monthlyTrends: Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month)),
        categoryBreakdown: Object.values(categoryData),
        summary: {
          totalSuppliers: suppliersCount,
          totalValue: suppliersValues.reduce((sum: number, s: any) => sum + s.totalValue, 0),
          avgDeliveryTime: suppliersCount > 0 ? Number(totalDeliveryTime) / Number(suppliersCount) : 0,
          avgOnTimePercentage: suppliersCount > 0 ? Number(totalOnTimePercentage) / Number(suppliersCount) : 0
        }
      };
    },
  });

  if (isLoading) {
    return <OptimizedSkeleton type="table" count={4} />;
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Fournisseurs</p>
                <p className="text-2xl font-bold">{analyticsData?.summary.totalSuppliers || 0}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valeur Totale</p>
                <p className="text-2xl font-bold">{(analyticsData?.summary.totalValue || 0).toLocaleString()} €</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Délai Moyen</p>
                <p className="text-2xl font-bold">{analyticsData?.summary.avgDeliveryTime?.toFixed(0) || 0} jours</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ponctualité Moyenne</p>
                <p className="text-2xl font-bold">{analyticsData?.summary.avgOnTimePercentage?.toFixed(0) || 0}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendances mensuelles */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Mensuelle des Commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData?.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="orders" orientation="left" />
                  <YAxis yAxisId="value" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="hsl(var(--primary))" name="Commandes" />
                  <Line yAxisId="value" type="monotone" dataKey="value" stroke="hsl(var(--secondary))" name="Valeur €" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Répartition par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData?.categoryBreakdown || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analyticsData?.categoryBreakdown?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR')} €`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 fournisseurs par valeur */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Fournisseurs par Valeur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData?.suppliers?.slice(0, 5) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalValue" fill="hsl(var(--primary))" name="Valeur totale €" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alertes et recommandations */}
        <Card>
          <CardHeader>
            <CardTitle>Alertes & Recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData?.suppliers?.map((supplier: any) => {
                const alerts = [];
                
                if (supplier.onTimePercentage < 70) {
                  alerts.push({
                    type: 'warning',
                    message: `${supplier.name}: Ponctualité faible (${supplier.onTimePercentage.toFixed(0)}%)`
                  });
                }
                
                if (supplier.avgDeliveryTime > 21) {
                  alerts.push({
                    type: 'warning',
                    message: `${supplier.name}: Délais de livraison élevés (${supplier.avgDeliveryTime.toFixed(0)} jours)`
                  });
                }

                if (supplier.latestEvaluation && supplier.latestEvaluation < 3) {
                  alerts.push({
                    type: 'error',
                    message: `${supplier.name}: Évaluation faible (${supplier.latestEvaluation}/5)`
                  });
                }

                return alerts.length > 0 ? (
                  <div key={supplier.id} className="space-y-2">
                    {alerts.map((alert, index) => (
                      <div key={index} className={`flex items-center gap-2 p-2 rounded ${
                        alert.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                ) : null;
              }).filter(Boolean).slice(0, 5)}

              {!analyticsData?.suppliers?.some((s: any) => 
                s.onTimePercentage < 70 || s.avgDeliveryTime > 21 || (s.latestEvaluation && s.latestEvaluation < 3)
              ) && (
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Aucune alerte - Tous vos fournisseurs performent bien!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}