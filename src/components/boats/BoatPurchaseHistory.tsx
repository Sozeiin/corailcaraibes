import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { ShoppingCart, Package, Calendar, DollarSign, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BoatPurchaseHistoryProps {
  boatId: string;
  boatName: string;
}

interface PurchaseRecord {
  id: string;
  order_number: string;
  order_date: string;
  delivery_date: string | null;
  status: string;
  total_amount: number | null;
  supplier: {
    name: string;
    category: string | null;
  } | null;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number | null;
    reference: string | null;
  }[];
}

export const BoatPurchaseHistory: React.FC<BoatPurchaseHistoryProps> = ({ boatId, boatName }) => {
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['boat-purchase-history', boatId],
    queryFn: async () => {
      // Fetch orders that are related to this boat through component purchase history
      const { data: componentPurchases, error: componentError } = await supabase
        .from('component_purchase_history')
        .select(`
          order_id,
          orders!inner(
            id,
            order_number,
            created_at,
            delivery_date,
            status,
            total_amount,
            suppliers(
              name,
              category
            )
          )
        `)
        .eq('orders.base_id', boatId); // This should actually be based on boat components

      if (componentError) {
        console.error('Error fetching component purchases:', componentError);
      }

      // Also fetch orders that might be directly related to boat components
      const { data: boatOrders, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          delivery_date,
          status,
          total_amount,
          suppliers(
            name,
            category
          ),
          order_items(
            product_name,
            quantity,
            unit_price,
            total_price,
            reference
          )
        `)
        .eq('boat_id', boatId);

      if (orderError) {
        console.error('Error fetching boat orders:', orderError);
      }

      // Combine and format the data
      const allOrders = [...(boatOrders || [])];
      
      return allOrders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        order_date: order.created_at,
        delivery_date: order.delivery_date,
        status: order.status,
        total_amount: order.total_amount,
        supplier: order.suppliers,
        items: order.order_items || []
      })) as PurchaseRecord[];
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'default';
      case 'order_confirmed':
      case 'shipping_antilles':
        return 'secondary';
      case 'pending_approval':
      case 'supplier_search':
        return 'outline';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Livré';
      case 'completed': return 'Terminé';
      case 'order_confirmed': return 'Commande confirmée';
      case 'shipping_antilles': return 'Expédition en cours';
      case 'pending_approval': return 'En attente d\'approbation';
      case 'supplier_search': return 'Recherche fournisseur';
      case 'rejected': return 'Rejeté';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const totalSpent = purchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <OptimizedSkeleton type="list" count={3} />
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Aucun achat trouvé</p>
          <p className="text-sm text-muted-foreground">
            Aucun historique d'achat n'est disponible pour ce bateau.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Résumé des achats - {boatName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{purchases.length}</p>
              <p className="text-sm text-muted-foreground">Commandes totales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {totalSpent.toLocaleString('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR' 
                })}
              </p>
              <p className="text-sm text-muted-foreground">Montant total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {purchases.filter(p => p.status === 'delivered' || p.status === 'completed').length}
              </p>
              <p className="text-sm text-muted-foreground">Commandes livrées</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Historique des achats</h3>
        {purchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold">{purchase.order_number}</h4>
                    <p className="text-sm text-muted-foreground">
                      {purchase.supplier?.name || 'Fournisseur non spécifié'}
                      {purchase.supplier?.category && ` - ${purchase.supplier.category}`}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(purchase.status)}>
                  {getStatusLabel(purchase.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Date commande</p>
                      <p className="text-muted-foreground">
                        {format(new Date(purchase.order_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  
                  {purchase.delivery_date && (
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Date livraison</p>
                        <p className="text-muted-foreground">
                          {format(new Date(purchase.delivery_date), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="font-medium">Articles</p>
                    <p className="text-muted-foreground">{purchase.items.length} article(s)</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">Montant total</p>
                    <p className="text-muted-foreground">
                      {purchase.total_amount?.toLocaleString('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR' 
                      }) || 'Non spécifié'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-2">
                  <h5 className="font-medium">Articles commandés</h5>
                  <div className="space-y-2">
                    {purchase.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          {item.reference && (
                            <p className="text-sm text-muted-foreground">Réf: {item.reference}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {item.quantity} x {item.unit_price.toLocaleString('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total: {(item.total_price || (item.quantity * item.unit_price)).toLocaleString('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};