import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Package,
  Star,
  Truck
} from 'lucide-react';

interface StockSupplierAnalysisProps {
  baseId?: string;
  timeRange: string;
}

export function StockSupplierAnalysis({ baseId, timeRange }: StockSupplierAnalysisProps) {
  // Fetch supplier performance data
  const { data: supplierData, isLoading } = useQuery({
    queryKey: ['supplier-analysis', baseId, timeRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Get orders with suppliers
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

      // Get stock items with suppliers
      let stockQuery = supabase
        .from('stock_items')
        .select(`
          *,
          suppliers!last_supplier_id(id, name, category)
        `);

      if (baseId) {
        stockQuery = stockQuery.eq('base_id', baseId);
      }

      const { data: stockItems, error: stockError } = await stockQuery;
      if (stockError) throw stockError;

      // Aggregate supplier data
      const supplierStats: any = {};

      // Process orders
      orders.forEach((order: any) => {
        if (!order.suppliers) return;
        
        const supplierId = order.suppliers.id;
        if (!supplierStats[supplierId]) {
          supplierStats[supplierId] = {
            id: supplierId,
            name: order.suppliers.name,
            category: order.suppliers.category,
            totalOrders: 0,
            totalValue: 0,
            totalItems: 0,
            avgDeliveryTime: 0,
            stockItems: 0,
            onTimeDeliveries: 0,
            deliveryTimes: []
          };
        }

        const totalOrderValue = order.order_items.reduce((sum: number, item: any) => 
          sum + (item.quantity * item.unit_price), 0
        );
        const totalOrderItems = order.order_items.reduce((sum: number, item: any) => 
          sum + item.quantity, 0
        );

        supplierStats[supplierId].totalOrders += 1;
        supplierStats[supplierId].totalValue += totalOrderValue;
        supplierStats[supplierId].totalItems += totalOrderItems;

        // Calculate delivery time if both dates are available
        if (order.order_date && order.delivery_date) {
          const deliveryTime = Math.floor(
            (new Date(order.delivery_date).getTime() - new Date(order.order_date).getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          supplierStats[supplierId].deliveryTimes.push(deliveryTime);
          
          // Assume on-time if delivered within expected timeframe
          if (deliveryTime <= (order.expected_delivery_date ? 
            Math.floor((new Date(order.expected_delivery_date).getTime() - new Date(order.order_date).getTime()) / (1000 * 60 * 60 * 24)) : 
            14)) {
            supplierStats[supplierId].onTimeDeliveries += 1;
          }
        }
      });

      // Process stock items
      stockItems.forEach((item: any) => {
        if (!item.suppliers) return;
        
        const supplierId = item.suppliers.id;
        if (!supplierStats[supplierId]) {
          supplierStats[supplierId] = {
            id: supplierId,
            name: item.suppliers.name,
            category: item.suppliers.category,
            totalOrders: 0,
            totalValue: 0,
            totalItems: 0,
            avgDeliveryTime: 0,
            stockItems: 0,
            onTimeDeliveries: 0,
            deliveryTimes: []
          };
        }

        supplierStats[supplierId].stockItems += 1;
      });

      // Calculate averages and performance metrics
      Object.values(supplierStats).forEach((supplier: any) => {
        if (supplier.deliveryTimes.length > 0) {
        supplier.avgDeliveryTime = supplier.deliveryTimes.reduce((sum: number, time: number) => sum + time, 0) / supplier.deliveryTimes.length;
        }
        supplier.onTimePercentage = supplier.totalOrders > 0 ? (supplier.onTimeDeliveries / supplier.totalOrders) * 100 : 0;
        supplier.avgOrderValue = supplier.totalOrders > 0 ? supplier.totalValue / supplier.totalOrders : 0;
        
        // Calculate performance score (out of 5)
        let score = 3; // Base score
        if (supplier.onTimePercentage >= 90) score += 1;
        if (supplier.onTimePercentage >= 95) score += 0.5;
        if (supplier.avgDeliveryTime <= 7) score += 0.5;
        if (supplier.totalOrders >= 5) score += 0.5;
        supplier.performanceScore = Math.min(5, score);
      });

      return Object.values(supplierStats).sort((a: any, b: any) => b.totalValue - a.totalValue);
    },
  });

  const getPerformanceStars = (score: number) => {
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars 
                ? 'text-yellow-400 fill-current' 
                : i === fullStars && hasHalfStar 
                  ? 'text-yellow-400 fill-current opacity-50'
                  : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {score.toFixed(1)}
        </span>
      </div>
    );
  };

  const getOnTimeBadge = (percentage: number) => {
    if (percentage >= 95) return <Badge variant="default">Excellent</Badge>;
    if (percentage >= 80) return <Badge variant="secondary">Bon</Badge>;
    if (percentage >= 60) return <Badge variant="outline">Moyen</Badge>;
    return <Badge variant="destructive">Faible</Badge>;
  };

  if (isLoading) {
    return <OptimizedSkeleton type="table" count={8} />;
  }

  const summary = {
    totalSuppliers: supplierData?.length || 0,
    totalValue: supplierData?.reduce((sum: number, supplier: any) => sum + supplier.totalValue, 0) || 0,
    avgDeliveryTime: supplierData?.length > 0 
      ? supplierData.reduce((sum: number, supplier: any) => sum + supplier.avgDeliveryTime, 0) / supplierData.length 
      : 0,
    topPerformer: supplierData?.sort((a: any, b: any) => (b as any).performanceScore - (a as any).performanceScore)?.[0] as any
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fournisseurs</p>
                <p className="text-2xl font-bold">{summary.totalSuppliers}</p>
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
                <p className="text-2xl font-bold">{summary.totalValue.toLocaleString('fr-FR')} €</p>
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
                <p className="text-2xl font-bold">{summary.avgDeliveryTime.toFixed(0)} jours</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold truncate">{summary.topPerformer?.name || 'N/A'}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance des Fournisseurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Commandes</TableHead>
                <TableHead>Valeur Totale</TableHead>
                <TableHead>Commande Moyenne</TableHead>
                <TableHead>Délai Moyen</TableHead>
                <TableHead>Ponctualité</TableHead>
                <TableHead>Articles en Stock</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierData?.map((supplier: any) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{supplier.category || 'Non catégorisé'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.totalOrders}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.totalValue.toLocaleString('fr-FR')} €</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.avgOrderValue.toLocaleString('fr-FR')} €
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.avgDeliveryTime.toFixed(0)} jours</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {getOnTimeBadge(supplier.onTimePercentage)}
                      <span className="text-sm text-muted-foreground">
                        {supplier.onTimePercentage.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{supplier.stockItems}</Badge>
                  </TableCell>
                  <TableCell>
                    {getPerformanceStars(supplier.performanceScore)}
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