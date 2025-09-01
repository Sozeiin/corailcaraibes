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

  // Récupérer les demandes d'approvisionnement correspondantes
  const { data: potentialRequests, isLoading } = useQuery({
    queryKey: ['potential-requests', stockItemId, stockItemName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supply_requests')
        .select(`
          id,
          request_number,
          status,
          created_at,
          supplier_name,
          item_name,
          quantity_needed
        `)
        .eq('base_id', user?.baseId)
        .in('status', ['ordered', 'shipped'])
        .ilike('item_name', stockItemName)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!stockItemId,
  });

  const handleLinkToOrder = async (requestId: string) => {
    setIsLinking(true);
    try {
      const { data, error } = await supabase.rpc('link_stock_scan_to_supply_request', {
        stock_item_id_param: stockItemId,
        request_id_param: requestId,
        quantity_received_param: quantityReceived
      });

      if (error) throw error;

      const result = data as { success: boolean; request_number?: string; error?: string };

      if (result?.success) {
        await queryClient.invalidateQueries({ queryKey: ['supply-requests'], exact: false });
        await queryClient.invalidateQueries({ queryKey: ['stock'], exact: false });
        toast({
          title: 'Liaison réussie',
          description: `Stock lié à la demande ${result.request_number}`,
        });
        onClose();
      } else {
        throw new Error(result?.error || 'Erreur lors de la liaison');
      }
    } catch (error) {
      console.error('Erreur liaison demande:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de lier le stock à cette demande',
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
            Lier le scan à une demande
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
            <div className="text-center py-4">Recherche des demandes...</div>
          ) : potentialRequests && potentialRequests.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-medium">Demandes correspondantes possibles :</h3>
              {potentialRequests.map((request: any) => (
                <Card key={request.id} className="p-3">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium">{request.request_number}</span>
                        <Badge
                          variant={request.status === 'ordered' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLinkToOrder(request.id)}
                        disabled={isLinking}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Lier
                      </Button>
                    </div>

                    {request.supplier_name && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Fournisseur: {request.supplier_name}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Article demandé: {request.item_name} (Qté: {request.quantity_needed})
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune demande correspondante trouvée</p>
              <p className="text-sm mt-1">
                L'article a été ajouté au stock sans liaison à une demande
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {potentialRequests && potentialRequests.length === 0 && (
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
