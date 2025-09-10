import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { Building2, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { StockItem } from '@/types';

interface SupplierHistoryProps {
  stockItem: StockItem;
}

export function SupplierHistory({ stockItem }: SupplierHistoryProps) {
  const { data: supplierData, isLoading } = useQuery({
    queryKey: ['supplier-history', stockItem.id],
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // Get current supplier info
      let currentSupplier = null;
      if (stockItem.lastSupplierId) {
        const { data: supplier, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', stockItem.lastSupplierId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching supplier:', error);
          return;
        }
        currentSupplier = supplier;
      }

      // Get all suppliers who have supplied this item through orders
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          orders (
            supplier_id,
            order_date,
            delivery_date,
            status,
            suppliers (
              id,
              name,
              email,
              phone,
              address,
              category
            )
          )
        `)
        .eq('stock_item_id', stockItem.id)
        .not('orders.supplier_id', 'is', null);

      if (orderError) throw orderError;

      // Get suppliers from direct purchase history
      const { data: purchaseHistory, error: purchaseError } = await supabase
        .from('component_purchase_history')
        .select(`
          purchase_date,
          supplier:suppliers (
            id,
            name,
            email,
            phone,
            address,
            category
          )
        `)
        .eq('stock_item_id', stockItem.id)
        .not('supplier_id', 'is', null);

      if (purchaseError) throw purchaseError;

      // Process supplier history
      const supplierMap = new Map();

      orderItems?.forEach(item => {
        if (item.orders?.suppliers) {
          const supplier = item.orders.suppliers;
          const supplierId = supplier.id;

          if (!supplierMap.has(supplierId)) {
            supplierMap.set(supplierId, {
              ...supplier,
              firstOrder: item.orders.order_date,
              lastOrder: item.orders.order_date,
              totalOrders: 0,
              deliveredOrders: 0
            });
          }

          const existing = supplierMap.get(supplierId);
          existing.totalOrders++;

          if (item.orders.status === 'delivered') {
            existing.deliveredOrders++;
          }

          if (item.orders.order_date < existing.firstOrder) {
            existing.firstOrder = item.orders.order_date;
          }

          if (item.orders.order_date > existing.lastOrder) {
            existing.lastOrder = item.orders.order_date;
          }
        }
      });

      purchaseHistory?.forEach(item => {
        if (item.supplier) {
          const supplier = item.supplier;
          const supplierId = supplier.id;

          if (!supplierMap.has(supplierId)) {
            supplierMap.set(supplierId, {
              ...supplier,
              firstOrder: item.purchase_date,
              lastOrder: item.purchase_date,
              totalOrders: 0,
              deliveredOrders: 0
            });
          }

          const existing = supplierMap.get(supplierId);
          existing.totalOrders++;
          existing.deliveredOrders++;

          if (item.purchase_date < existing.firstOrder) {
            existing.firstOrder = item.purchase_date;
          }

          if (item.purchase_date > existing.lastOrder) {
            existing.lastOrder = item.purchase_date;
          }
        }
      });

      return {
        currentSupplier,
        supplierHistory: Array.from(supplierMap.values())
      };
    }
  });

  if (isLoading) {
    return <OptimizedSkeleton type="grid" count={2} />;
  }

  const { currentSupplier, supplierHistory } = supplierData || {};

  return (
    <div className="space-y-6">
      {currentSupplier && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Fournisseur actuel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{currentSupplier.name}</h3>
              {currentSupplier.category && (
                <Badge variant="outline" className="mt-1">
                  {currentSupplier.category}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentSupplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{currentSupplier.email}</span>
                </div>
              )}

              {currentSupplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{currentSupplier.phone}</span>
                </div>
              )}

              {currentSupplier.address && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{currentSupplier.address}</span>
                </div>
              )}
            </div>

            {stockItem.lastPurchaseDate && (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Dernier achat: {new Date(stockItem.lastPurchaseDate).toLocaleDateString('fr-FR')}
                </div>
                {stockItem.lastPurchaseCost && (
                  <div className="text-sm text-muted-foreground">
                    Prix: {stockItem.lastPurchaseCost.toFixed(2)} €
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historique des fournisseurs</span>
            <Badge variant="outline">
              {supplierHistory?.length || 0} fournisseur(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!supplierHistory || supplierHistory.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun historique</h3>
              <p className="text-muted-foreground">
                Aucun fournisseur n'a été enregistré pour cet article.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplierHistory.map((supplier) => (
                <div key={supplier.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{supplier.name}</h4>
                      {supplier.category && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {supplier.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">
                        {supplier.totalOrders} commande(s)
                      </div>
                      <div className="text-muted-foreground">
                        {supplier.deliveredOrders} livrée(s)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>
                        Premier achat: {new Date(supplier.firstOrder).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>
                        Dernier achat: {new Date(supplier.lastOrder).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {(supplier.email || supplier.phone) && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {supplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}