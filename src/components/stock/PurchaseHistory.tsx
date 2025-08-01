import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { Package, Calendar, Euro, Truck } from 'lucide-react';
import { PurchaseHistoryItem } from '@/types';

interface PurchaseHistoryProps {
  stockItemId: string;
}

export function PurchaseHistory({ stockItemId }: PurchaseHistoryProps) {
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchase-history', stockItemId],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          orders (
            order_number,
            order_date,
            delivery_date,
            status,
            suppliers (
              name
            )
          )
        `)
        .eq('stock_item_id', stockItemId)
        .order('orders.order_date', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        orderNumber: item.orders?.order_number || '',
        supplierName: item.orders?.suppliers?.name || 'Fournisseur inconnu',
        orderDate: item.orders?.order_date || '',
        deliveryDate: item.orders?.delivery_date,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price || (item.quantity * item.unit_price),
        status: item.orders?.status || 'unknown'
      })) as PurchaseHistoryItem[];
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'confirmed': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Livré';
      case 'confirmed': return 'Confirmé';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulé';
      default: return 'Inconnu';
    }
  };

  if (isLoading) {
    return <OptimizedSkeleton type="list" count={3} />;
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-center mb-2">
            Aucun historique d'achat
          </h3>
          <p className="text-muted-foreground text-center">
            Cet article n'a pas encore été acheté ou les données d'achat ne sont pas disponibles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Historique des achats</h3>
        <Badge variant="outline">{purchases.length} commande(s)</Badge>
      </div>

      <div className="space-y-3">
        {purchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium mb-1">
                    Commande {purchase.orderNumber}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {purchase.supplierName}
                  </p>
                </div>
                <Badge variant={getStatusColor(purchase.status)}>
                  {getStatusLabel(purchase.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Commandé</p>
                    <p className="text-sm font-medium">
                      {new Date(purchase.orderDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {purchase.deliveryDate && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Livré</p>
                      <p className="text-sm font-medium">
                        {new Date(purchase.deliveryDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Quantité</p>
                    <p className="text-sm font-medium">{purchase.quantity}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Prix unitaire</p>
                    <p className="text-sm font-medium">
                      {purchase.unitPrice.toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-semibold">
                    {purchase.totalPrice.toFixed(2)} €
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}