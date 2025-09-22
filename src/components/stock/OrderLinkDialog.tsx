import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  // Récupérer les demandes d'approvisionnement ET les commandes correspondantes
  const { data: potentialItems, isLoading } = useQuery({
    queryKey: ['potential-linkable-items', stockItemId, stockItemName],
    queryFn: async () => {
      // Récupérer les demandes d'approvisionnement
      const { data: supplyRequests, error: supplyError } = await supabase
        .from('supply_requests')
        .select(`
          id,
          request_number,
          status,
          created_at,
          item_name,
          supplier_name
        `)
        .eq('base_id', user?.baseId)
        .eq('status', 'shipped')
        .order('created_at', { ascending: false })
        .limit(10);

      if (supplyError) throw supplyError;

      // Récupérer les commandes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          created_at,
          suppliers!inner(name)
        `)
        .eq('base_id', user?.baseId)
        .in('status', ['ordered', 'received', 'shipping_antilles'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) throw ordersError;

      // Récupérer les articles des commandes pour faire le matching
      const orderIds = orders?.map(o => o.id) || [];
      let orderItems: any[] = [];
      
      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('order_id, product_name, reference')
          .in('order_id', orderIds);
        
        if (!itemsError) {
          orderItems = items || [];
        }
      }

      const results: any[] = [];

      // Ajouter les demandes d'approvisionnement correspondantes
      if (supplyRequests) {
        const matchingRequests = supplyRequests.filter(request => 
          request.item_name && stockItemName &&
          (request.item_name.toLowerCase().includes(stockItemName.toLowerCase()) ||
           stockItemName.toLowerCase().includes(request.item_name.toLowerCase()))
        );
        
        matchingRequests.forEach(request => {
          results.push({
            ...request,
            type: 'supply_request',
            display_name: request.request_number,
            item_description: request.item_name
          });
        });
      }

      // Ajouter les commandes correspondantes
      if (orders) {
        orders.forEach(order => {
          const matchingItems = orderItems.filter(item => 
            item.order_id === order.id &&
            item.product_name && stockItemName &&
            (item.product_name.toLowerCase().includes(stockItemName.toLowerCase()) ||
             stockItemName.toLowerCase().includes(item.product_name.toLowerCase()))
          );
          
          if (matchingItems.length > 0) {
            results.push({
              ...order,
              type: 'order',
              display_name: order.order_number,
              item_description: matchingItems[0].product_name,
              supplier_name: order.suppliers?.name
            });
          }
        });
      }
      
      return results;
    },
    enabled: isOpen && !!stockItemId,
  });

  const handleLinkToItem = async (item: any) => {
    setIsLinking(true);
    try {
      let result: { success: boolean; message?: string; error?: string };

      if (item.type === 'supply_request') {
        // Lier à une demande d'approvisionnement
        const { data, error } = await supabase.rpc('link_stock_scan_to_supply_request', {
          stock_item_id_param: stockItemId,
          request_id_param: item.id,
          quantity_received_param: quantityReceived
        });

        if (error) throw error;
        result = data as { success: boolean; message?: string; error?: string };
      } else if (item.type === 'order') {
        // Lier à une commande
        const { data, error } = await supabase.rpc('link_stock_scan_to_order', {
          stock_item_id_param: stockItemId,
          order_id_param: item.id,
          quantity_received_param: quantityReceived
        });

        if (error) throw error;
        result = data as { success: boolean; message?: string; error?: string };
      } else {
        throw new Error('Type d\'élément non reconnu');
      }

      if (result?.success) {
        await queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
        await queryClient.invalidateQueries({ queryKey: ['orders'] });
        await queryClient.invalidateQueries({ queryKey: ['stock'] });
        await queryClient.invalidateQueries({ queryKey: ['purchase-history'] });
        toast({
          title: 'Liaison réussie',
          description: result.message || `Stock lié ${item.type === 'supply_request' ? 'à la demande d\'approvisionnement' : 'à la commande'}`,
        });
        onClose();
      } else {
        throw new Error(result?.error || 'Erreur lors de la liaison');
      }
    } catch (error) {
      console.error('Erreur liaison:', error);
      toast({
        title: 'Erreur',
        description: `Impossible de lier le stock à ${item.type === 'supply_request' ? 'cette demande' : 'cette commande'}`,
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
            Lier le scan à une demande d'approvisionnement
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
            <div className="text-center py-4">Recherche des éléments correspondants...</div>
          ) : potentialItems && potentialItems.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-medium">Éléments correspondants :</h3>
              {potentialItems.map((item: any) => (
                <Card key={`${item.type}-${item.id}`} className="p-3">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.display_name}</span>
                          <Badge
                            variant={item.type === 'supply_request' ? 'default' : 'outline'}
                            className="ml-2"
                          >
                            {item.type === 'supply_request' ? '📋 Demande' : '📦 Commande'}
                          </Badge>
                          <Badge
                            variant={item.status === 'shipped' || item.status === 'ordered' ? 'default' : 'secondary'}
                            className="ml-1"
                          >
                            {item.status === 'shipped' ? 'Expédié' : 
                             item.status === 'ordered' ? 'Commandé' :
                             item.status === 'received' ? 'Reçu' : item.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLinkToItem(item)}
                        disabled={isLinking}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Lier
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      Article: {item.item_description}
                    </p>

                    {item.supplier_name && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Fournisseur: {item.supplier_name}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground">
                      {item.type === 'supply_request' ? 'Demande' : 'Commande'} créée le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun élément correspondant trouvé</p>
              <p className="text-sm mt-1">
                L'article a été ajouté au stock sans liaison
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {potentialItems && potentialItems.length === 0 && (
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
