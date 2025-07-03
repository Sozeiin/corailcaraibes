import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function BulkPurchaseDashboard() {
  // Fetch bulk purchase statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['bulk-purchase-stats'],
    queryFn: async () => {
      // Get bulk orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*),
          bulk_purchase_distributions(*)
        `)
        .eq('is_bulk_purchase', true);

      if (ordersError) throw ordersError;

      // Calculate statistics
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
      const totalValue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      // Distribution statistics
      let totalDistributions = 0;
      let completedDistributions = 0;
      let pendingDistributions = 0;

      orders.forEach(order => {
        if (order.bulk_purchase_distributions) {
          order.bulk_purchase_distributions.forEach((dist: any) => {
            totalDistributions++;
            if (dist.status === 'distributed') {
              completedDistributions++;
            } else {
              pendingDistributions++;
            }
          });
        }
      });

      const distributionProgress = totalDistributions > 0 
        ? (completedDistributions / totalDistributions) * 100 
        : 0;

      // Monthly trend (simplified)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });

      return {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        totalValue,
        totalDistributions,
        completedDistributions,
        pendingDistributions,
        distributionProgress,
        monthlyOrders: monthlyOrders.length,
        monthlyValue: monthlyOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      };
    }
  });

  // Fetch recent activities
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recent-bulk-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          created_at,
          total_amount,
          suppliers(name)
        `)
        .eq('is_bulk_purchase', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tableau de Bord - Achats Groupés</h2>
        <p className="text-muted-foreground">Vue d'ensemble des achats groupés et leur distribution</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Achats Groupés</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.monthlyOrders || 0} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Totale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.monthlyValue || 0)} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              commandes à traiter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livrées</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deliveredOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              commandes complètes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <span>Progression des Distributions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Distribution Globale</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.completedDistributions || 0} / {stats?.totalDistributions || 0}
                </span>
              </div>
              <Progress value={stats?.distributionProgress || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {Math.round(stats?.distributionProgress || 0)}% des distributions terminées
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <div className="text-sm font-medium text-green-600">Terminées</div>
                <div className="text-lg font-bold">{stats?.completedDistributions || 0}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-orange-600">En Cours</div>
                <div className="text-lg font-bold">{stats?.pendingDistributions || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Activités Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activité récente</p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.suppliers?.name} • {formatCurrency(activity.total_amount || 0)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          activity.status === 'delivered' ? 'default' :
                          activity.status === 'confirmed' ? 'secondary' :
                          'outline'
                        }
                      >
                        {activity.status === 'pending' && 'En attente'}
                        {activity.status === 'confirmed' && 'Confirmée'}
                        {activity.status === 'delivered' && 'Livrée'}
                        {activity.status === 'cancelled' && 'Annulée'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {stats?.pendingDistributions && stats.pendingDistributions > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Actions Requises</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700">
              Il y a {stats.pendingDistributions} distributions en attente qui nécessitent votre attention.
              Consultez les achats groupés pour gérer les réceptions et distributions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}