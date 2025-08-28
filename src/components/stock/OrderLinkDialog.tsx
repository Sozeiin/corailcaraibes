import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Link, Check } from 'lucide-react';

interface OrderLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stockItemId: string;
  stockItemName: string;
  quantityReceived: number;
}

export function OrderLinkDialog({ 
  isOpen, 
  onClose, 
  stockItemId, 
  stockItemName, 
  quantityReceived 
}: OrderLinkDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);

  // Récupérer les commandes en cours qui pourraient correspondre
  const { data: potentialOrders, isLoading } = useQuery({
    queryKey: ['potential-orders', stockItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          created_at,
          supplier:suppliers(name),
          order_items!inner(
            id,
            product_name,
            quantity,
            reference,
            stock_item_id
          )
        `)
        .eq('base_id', user?.baseId)
        .in('status', ['ordered', 'supplier_search'])
        .eq('stock_item_id', stockItemId, { foreignTable: 'order_items' })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!stockItemId,
  });

  const handleLinkToOrder = async (orderId: string) => {
    setIsLinking(true);
    try {
      const { data, error } = await supabase.rpc('link_stock_scan_to_order', {
        stock_item_id_param: stockItemId,
        order_id_param: orderId,
        quantity_received_param: quantityReceived
      });

      if (error) throw error;

      const result = data as { success: boolean; order_number?: string; error?: string };

      if (result?.success) {
        toast({
          title: 'Liaison réussie',
          description: `Stock lié à la commande ${result.order_number}`,
        });
        onClose();
      } else {
        throw new Error(result?.error || 'Erreur lors de la liaison');
      }
    } catch (error) {
      console.error('Erreur liaison commande:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de lier le stock à cette commande',
        variant: 'destructive'
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Lier le scan à une commande
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4" />
              <span className="font-medium">Article scanné</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {stockItemName} - Quantité reçue: {quantityReceived}
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Recherche des commandes...</div>
          ) : potentialOrders && potentialOrders.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-medium">Commandes correspondantes possibles :</h3>
              {potentialOrders.map((order: any) => (
                <Card key={order.id} className="p-3">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium">{order.order_number}</span>
                        <Badge 
                          variant={order.status === 'ordered' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {order.status === 'draft' ? 'Brouillon' : 
                           order.status === 'ordered' ? 'Commandé' : order.status}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLinkToOrder(order.id)}
                        disabled={isLinking}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Lier
                      </Button>
                    </div>
                    
                    {order.supplier && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Fournisseur: {order.supplier.name}
                      </p>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Articles commandés:
                      <ul className="ml-2 mt-1">
                        {order.order_items.map((item: any) => (
                          <li key={item.id}>
                            • {item.product_name} (Qté: {item.quantity})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune commande correspondante trouvée</p>
              <p className="text-sm mt-1">
                L'article a été ajouté au stock sans liaison à une commande
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {potentialOrders && potentialOrders.length === 0 && (
              <Button onClick={onClose} className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Continuer sans liaison
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}