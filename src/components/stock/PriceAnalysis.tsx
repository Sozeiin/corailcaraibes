import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { TrendingUp, TrendingDown, Minus, Euro, BarChart3 } from 'lucide-react';

interface PriceAnalysisProps {
  stockItemId: string;
}

export function PriceAnalysis({ stockItemId }: PriceAnalysisProps) {
  const { data: priceData, isLoading } = useQuery({
    queryKey: ['price-analysis', stockItemId],
    staleTime: 15 * 60 * 1000, // 15 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          unit_price,
          quantity,
          total_price,
          orders (
            order_date,
            delivery_date,
            status
          )
        `)
        .eq('stock_item_id', stockItemId)
        .not('unit_price', 'is', null)
        .order('orders.order_date', { ascending: true });

      if (error) throw error;

      const deliveredOrders = data.filter(item => 
        item.orders?.status === 'delivered' && item.orders.delivery_date
      );

      if (deliveredOrders.length === 0) {
        return null;
      }

      const prices = deliveredOrders.map(item => item.unit_price);
      const totalQuantity = deliveredOrders.reduce((sum, item) => sum + item.quantity, 0);
      const totalCost = deliveredOrders.reduce((sum, item) => 
        sum + (item.total_price || item.unit_price * item.quantity), 0
      );

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const lastPrice = prices[prices.length - 1];
      const firstPrice = prices[0];

      // Calculate price trend
      let trend = 'stable';
      let trendPercentage = 0;
      if (prices.length > 1) {
        trendPercentage = ((lastPrice - firstPrice) / firstPrice) * 100;
        if (Math.abs(trendPercentage) > 5) {
          trend = trendPercentage > 0 ? 'increasing' : 'decreasing';
        }
      }

      // Price history for chart
      const priceHistory = deliveredOrders.map(item => ({
        date: item.orders.delivery_date,
        price: item.unit_price,
        quantity: item.quantity
      }));

      return {
        minPrice,
        maxPrice,
        avgPrice,
        lastPrice,
        firstPrice,
        trend,
        trendPercentage,
        totalOrders: deliveredOrders.length,
        totalQuantity,
        totalCost,
        avgOrderValue: totalCost / deliveredOrders.length,
        priceHistory
      };
    }
  });

  if (isLoading) {
    return <OptimizedSkeleton type="grid" count={4} />;
  }

  if (!priceData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-center mb-2">
            Aucune donnée d'analyse
          </h3>
          <p className="text-muted-foreground text-center">
            Pas assez de données de prix pour effectuer une analyse.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600';
      case 'decreasing':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'En hausse';
      case 'decreasing':
        return 'En baisse';
      default:
        return 'Stable';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Prix moyen</span>
            </div>
            <div className="text-xl font-bold">
              {priceData.avgPrice.toFixed(2)} €
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Prix actuel</span>
            </div>
            <div className="text-xl font-bold">
              {priceData.lastPrice.toFixed(2)} €
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Prix min/max</span>
            </div>
            <div className="text-lg font-bold">
              {priceData.minPrice.toFixed(2)} € / {priceData.maxPrice.toFixed(2)} €
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(priceData.trend)}
              <span className="text-sm text-muted-foreground">Tendance</span>
            </div>
            <div className={`text-lg font-bold ${getTrendColor(priceData.trend)}`}>
              {getTrendLabel(priceData.trend)}
              {Math.abs(priceData.trendPercentage) > 0 && (
                <span className="text-sm ml-1">
                  ({priceData.trendPercentage > 0 ? '+' : ''}{priceData.trendPercentage.toFixed(1)}%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Résumé des achats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total des commandes</span>
              <span className="font-semibold">{priceData.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Quantité totale achetée</span>
              <span className="font-semibold">{priceData.totalQuantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Coût total</span>
              <span className="font-semibold">{priceData.totalCost.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Valeur moyenne par commande</span>
              <span className="font-semibold">{priceData.avgOrderValue.toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Évolution des prix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priceData.priceHistory.slice(-5).map((entry, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <div className="text-sm font-medium">
                      {new Date(entry.date).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Qté: {entry.quantity}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {entry.price.toFixed(2)} €
                    </div>
                  </div>
                </div>
              ))}
              {priceData.priceHistory.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  ... et {priceData.priceHistory.length - 5} autre(s) commande(s)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}