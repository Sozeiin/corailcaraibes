import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  Users,
  Euro,
  Clock,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function PurchasingDashboard() {
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['purchasing-dashboard'],
    queryFn: async () => {
      // Get orders statistics
      const { data: ordersData } = await supabase
        .from('orders')
        .select('status, total_amount, created_at, is_bulk_purchase');

      // Get suppliers count
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id');

      // Get low stock items
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('quantity, min_threshold')
        .filter('quantity', 'lt', 'min_threshold');

      // Get recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          suppliers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const totalOrders = ordersData?.length || 0;
      const pendingOrders = ordersData?.filter(o => o.status === 'pending').length || 0;
      const monthlySpending = ordersData
        ?.filter(o => {
          const orderDate = new Date(o.created_at);
          const now = new Date();
          return orderDate.getMonth() === now.getMonth() && 
                 orderDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      const bulkOrders = ordersData?.filter(o => o.is_bulk_purchase).length || 0;

      return {
        totalOrders,
        pendingOrders,
        completedOrders: ordersData?.filter(o => o.status === 'delivered').length || 0,
        monthlySpending,
        suppliersCount: suppliersData?.length || 0,
        lowStockItems: stockData?.length || 0,
        bulkOrders,
        recentOrders: recentOrders || []
      };
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'Commandes Totales',
      value: dashboardStats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'En Attente',
      value: dashboardStats?.pendingOrders || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Livrées',
      value: dashboardStats?.completedOrders || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Dépenses Mensuel',
      value: formatCurrency(dashboardStats?.monthlySpending || 0),
      icon: Euro,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Fournisseurs',
      value: dashboardStats?.suppliersCount || 0,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'Stock Faible',
      value: dashboardStats?.lowStockItems || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Achats Groupés',
      value: dashboardStats?.bulkOrders || 0,
      icon: Package,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    },
    {
      title: 'Croissance',
      value: '+15%',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'En attente', variant: 'secondary' as const },
      confirmed: { label: 'Confirmée', variant: 'default' as const },
      delivered: { label: 'Livrée', variant: 'default' as const },
      cancelled: { label: 'Annulée', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Commandes Récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardStats?.recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{order.order_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {order.suppliers?.name || 'Fournisseur non spécifié'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(order.total_amount || 0)}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}