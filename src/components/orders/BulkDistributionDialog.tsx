import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Order, BulkPurchaseDistribution } from '@/types';
import { Package, Truck, CheckCircle } from 'lucide-react';

interface BulkDistributionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export function BulkDistributionDialog({ isOpen, onClose, order }: BulkDistributionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [distributions, setDistributions] = useState<any[]>([]);

  // Fetch bases
  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch existing distributions
  const { data: existingDistributions = [], isLoading } = useQuery({
    queryKey: ['bulk-distributions', order?.id],
    queryFn: async () => {
      if (!order?.id) return [];
      const { data, error } = await supabase
        .from('bulk_purchase_distributions')
        .select(`
          *,
          order_items(product_name),
          bases(name, location)
        `)
        .eq('order_id', order.id);
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id
  });

  // Initialize distributions when order or existing data changes
  useEffect(() => {
    if (order?.items && bases.length > 0) {
      const newDistributions = order.items.flatMap(item => 
        bases.map(base => {
          const existing = existingDistributions.find(
            d => d.order_item_id === item.id && d.base_id === base.id
          );
          return {
            id: existing?.id || null,
            orderItemId: item.id,
            productName: item.productName,
            totalQuantity: item.quantity,
            baseId: base.id,
            baseName: base.name,
            allocatedQuantity: existing?.allocated_quantity || 0,
            receivedQuantity: existing?.received_quantity || 0,
            status: existing?.status || 'allocated',
            notes: existing?.notes || ''
          };
        })
      );
      setDistributions(newDistributions);
    }
  }, [order, bases, existingDistributions]);

  const updateDistributionMutation = useMutation({
    mutationFn: async (updatedDistributions: any[]) => {
      const updates = updatedDistributions.map(dist => ({
        id: dist.id,
        order_id: order!.id,
        order_item_id: dist.orderItemId,
        base_id: dist.baseId,
        allocated_quantity: dist.allocatedQuantity,
        received_quantity: dist.receivedQuantity,
        status: dist.status,
        notes: dist.notes
      }));

      // Update or insert distributions
      for (const update of updates) {
        if (update.id) {
          const { error } = await supabase
            .from('bulk_purchase_distributions')
            .update(update)
            .eq('id', update.id);
          if (error) throw error;
        } else if (update.allocated_quantity > 0) {
          const { error } = await supabase
            .from('bulk_purchase_distributions')
            .insert({
              order_id: update.order_id,
              order_item_id: update.order_item_id,
              base_id: update.base_id,
              allocated_quantity: update.allocated_quantity,
              received_quantity: update.received_quantity,
              status: update.status,
              notes: update.notes
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: 'Distribution mise à jour avec succès'
      });
      queryClient.invalidateQueries({ queryKey: ['bulk-distributions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour de la distribution',
        variant: 'destructive'
      });
    }
  });

  const updateDistribution = (index: number, field: string, value: any) => {
    const updated = [...distributions];
    updated[index] = { ...updated[index], [field]: value };
    setDistributions(updated);
  };

  const handleSave = () => {
    updateDistributionMutation.mutate(distributions);
  };

  if (!order) return null;

  // Group distributions by product
  const distributionsByProduct = distributions.reduce((acc, dist) => {
    if (!acc[dist.productName]) {
      acc[dist.productName] = {
        totalQuantity: dist.totalQuantity,
        distributions: []
      };
    }
    acc[dist.productName].distributions.push(dist);
    return acc;
  }, {} as any);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <span>Distribution - {order.orderNumber}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(distributionsByProduct).map(([productName, productData]: [string, any]) => (
              <Card key={productName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>{productName}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Total: {productData.totalQuantity} unités
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productData.distributions.map((dist: any, index: number) => {
                      const globalIndex = distributions.findIndex(
                        d => d.orderItemId === dist.orderItemId && d.baseId === dist.baseId
                      );
                      
                      return (
                        <div key={`${dist.orderItemId}-${dist.baseId}`} 
                             className="grid grid-cols-6 gap-4 p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{dist.baseName}</Label>
                            <div className="text-xs text-muted-foreground">Base</div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Alloué</Label>
                            <Input
                              type="number"
                              value={dist.allocatedQuantity}
                              onChange={(e) => updateDistribution(globalIndex, 'allocatedQuantity', parseInt(e.target.value) || 0)}
                              min="0"
                              max={productData.totalQuantity}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Reçu</Label>
                            <Input
                              type="number"
                              value={dist.receivedQuantity}
                              onChange={(e) => updateDistribution(globalIndex, 'receivedQuantity', parseInt(e.target.value) || 0)}
                              min="0"
                              max={dist.allocatedQuantity}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Statut</Label>
                            <Select
                              value={dist.status}
                              onValueChange={(value) => updateDistribution(globalIndex, 'status', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="allocated">Alloué</SelectItem>
                                <SelectItem value="received">Reçu</SelectItem>
                                <SelectItem value="distributed">Distribué</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>% Complet</Label>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm">
                                {dist.allocatedQuantity > 0 
                                  ? Math.round((dist.receivedQuantity / dist.allocatedQuantity) * 100)
                                  : 0}%
                              </div>
                              {dist.receivedQuantity === dist.allocatedQuantity && dist.allocatedQuantity > 0 && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                              value={dist.notes}
                              onChange={(e) => updateDistribution(globalIndex, 'notes', e.target.value)}
                              placeholder="Notes..."
                              rows={2}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateDistributionMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {updateDistributionMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}