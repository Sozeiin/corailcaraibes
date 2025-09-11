import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Package, Truck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SupplyRequest } from '@/pages/SupplyRequests';
import { SupplierAutocomplete } from '@/components/suppliers/SupplierAutocomplete';

interface FormData {
  status: string;
  rejection_reason: string;
  purchase_price: number;
  supplier_name: string;
  tracking_number: string;
  carrier: string;
}

interface SupplyManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: SupplyRequest | null;
  onSuccess: () => void;
}

export function SupplyManagementDialog({ isOpen, onClose, request, onSuccess }: SupplyManagementDialogProps) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<'approve' | 'reject' | 'order' | 'ship' | null>(null);

  // Function to create purchase history entry
  const createPurchaseHistoryEntry = async (supplyRequest: SupplyRequest, purchasePrice: number, supplierName: string) => {
    try {
      // Get supplier ID from name
      const { data: suppliers, error: supplierError } = await supabase
        .from('suppliers')
        .select('id')
        .ilike('name', supplierName)
        .limit(1);

      if (supplierError) {
        console.warn('Could not find supplier:', supplierError);
      }

      const supplierId = suppliers?.[0]?.id;

      // Find or create stock item
      let stockItemId = supplyRequest.stock_item_id;
      
      if (!stockItemId) {
        // Try to find existing stock item by name and base
        const { data: existingStockItems } = await supabase
          .from('stock_items')
          .select('id')
          .eq('name', supplyRequest.item_name)
          .eq('base_id', supplyRequest.base_id)
          .limit(1);

        if (existingStockItems && existingStockItems.length > 0) {
          stockItemId = existingStockItems[0].id;
        } else {
          // Create new stock item
          const { data: newStockItem, error: stockError } = await supabase
            .from('stock_items')
            .insert({
              name: supplyRequest.item_name,
              reference: supplyRequest.item_reference,
              category: 'Approvisionnement',
              quantity: 0, // Will be updated when received
              min_threshold: 1,
              unit: 'pièce',
              base_id: supplyRequest.base_id,
            })
            .select('id')
            .single();

          if (stockError) {
            console.error('Error creating stock item:', stockError);
            return;
          }
          stockItemId = newStockItem.id;
        }

        // Update supply request with stock_item_id
        await supabase
          .from('supply_requests')
          .update({ stock_item_id: stockItemId })
          .eq('id', supplyRequest.id);
      }

      // Create purchase history entry
      const purchaseHistoryData: any = {
        stock_item_id: stockItemId,
        supplier_id: supplierId,
        purchase_date: new Date().toISOString().split('T')[0],
        unit_cost: purchasePrice,
        quantity: supplyRequest.quantity_needed,
        total_cost: purchasePrice * supplyRequest.quantity_needed,
        warranty_months: 12, // Default warranty
        notes: `Achat via demande d'approvisionnement ${supplyRequest.request_number}`,
      };

      // If linked to a boat, add component relationship
      if (supplyRequest.boat_id) {
        // Try to find a matching component based on item name
        const { data: components } = await supabase
          .from('boat_components')
          .select('id')
          .eq('boat_id', supplyRequest.boat_id)
          .ilike('component_name', `%${supplyRequest.item_name}%`)
          .limit(1);

        if (components && components.length > 0) {
          purchaseHistoryData.component_id = components[0].id;
        }
      }

      const { error: purchaseError } = await supabase
        .from('component_purchase_history')
        .insert(purchaseHistoryData);

      if (purchaseError) {
        console.error('Error creating purchase history:', purchaseError);
        toast({
          title: "Avertissement",
          description: "La demande a été mise à jour mais l'historique d'achat n'a pas pu être créé.",
          variant: "destructive",
        });
      } else {
        console.log('Purchase history entry created successfully');
      }
    } catch (error) {
      console.error('Error in createPurchaseHistoryEntry:', error);
    }
  };

  const form = useForm<FormData>({
    defaultValues: {
      status: '',
      rejection_reason: '',
      purchase_price: 0,
      supplier_name: '',
      tracking_number: '',
      carrier: '',
    },
  });

  // Update supply request mutation with purchase history creation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<FormData> & { id: string }) => {
      const updateData: any = {
        status: data.status,
        updated_at: new Date().toISOString(),
      };

      if (data.status === 'approved') {
        updateData.validated_at = new Date().toISOString();
      } else if (data.status === 'rejected') {
        updateData.rejection_reason = data.rejection_reason;
      } else if (data.status === 'ordered') {
        updateData.purchase_price = data.purchase_price;
        updateData.supplier_name = data.supplier_name;
      } else if (data.status === 'shipped') {
        updateData.tracking_number = data.tracking_number;
        updateData.carrier = data.carrier;
        updateData.shipped_at = new Date().toISOString();
      }

      // Update supply request first
      const { error: updateError } = await supabase
        .from('supply_requests')
        .update(updateData)
        .eq('id', data.id);

      if (updateError) throw updateError;

      // If status is 'ordered' and we have purchase details, create purchase history entry
      if (data.status === 'ordered' && data.purchase_price && data.supplier_name && request) {
        await createPurchaseHistoryEntry(request, data.purchase_price, data.supplier_name);
      }
    },
    onSuccess: () => {
      toast({
        title: "Demande mise à jour",
        description: "La demande d'approvisionnement a été mise à jour avec succès.",
      });
      onSuccess();
      setAction(null);
      form.reset();
    },
    onError: (error) => {
      console.error('Error updating supply request:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (!request) return;
    updateMutation.mutate({
      id: request.id,
      status: 'approved',
    });
  };

  const handleReject = (data: FormData) => {
    if (!request) return;
    updateMutation.mutate({
      id: request.id,
      status: 'rejected',
      rejection_reason: data.rejection_reason,
    });
  };

  const handleOrder = (data: FormData) => {
    if (!request) return;
    updateMutation.mutate({
      id: request.id,
      status: 'ordered',
      purchase_price: data.purchase_price,
      supplier_name: data.supplier_name,
    });
  };

  const handleShip = (data: FormData) => {
    if (!request) return;
    updateMutation.mutate({
      id: request.id,
      status: 'shipped',
      tracking_number: data.tracking_number,
      carrier: data.carrier,
    });
  };

  const onSubmit = (data: FormData) => {
    switch (action) {
      case 'reject':
        handleReject(data);
        break;
      case 'order':
        handleOrder(data);
        break;
      case 'ship':
        handleShip(data);
        break;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente de validation';
      case 'approved': return 'Approuvé';
      case 'ordered': return 'Commandé';
      case 'shipped': return 'Expédié';
      case 'received': return 'Reçu';
      case 'completed': return 'Terminé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  const getAvailableActions = () => {
    if (!request) return [];
    
    const actions = [];
    
    switch (request.status) {
      case 'pending':
        actions.push(
          { key: 'approve', label: 'Approuver', icon: CheckCircle, variant: 'default' as const },
          { key: 'reject', label: 'Rejeter', icon: XCircle, variant: 'destructive' as const }
        );
        break;
      case 'approved':
        actions.push(
          { key: 'order', label: 'Marquer comme commandé', icon: Package, variant: 'default' as const }
        );
        break;
      case 'ordered':
        actions.push(
          { key: 'ship', label: 'Marquer comme expédié', icon: Truck, variant: 'default' as const }
        );
        break;
    }
    
    return actions;
  };

  useEffect(() => {
    if (!isOpen) {
      setAction(null);
      form.reset();
    }
  }, [isOpen, form]);

  if (!request) return null;

  const availableActions = getAvailableActions();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Gérer la demande {request.request_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="space-y-2">
            <Label>Statut actuel</Label>
            <Badge variant="secondary">{getStatusLabel(request.status)}</Badge>
          </div>

          {/* Request Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium">{request.item_name}</h4>
            <p className="text-sm text-muted-foreground">Quantité: {request.quantity_needed}</p>
            <p className="text-sm text-muted-foreground">Demandé par: {request.requester?.name}</p>
            {request.urgency_level !== 'normal' && (
              <Badge variant={request.urgency_level === 'urgent' ? 'destructive' : 'outline'}>
                {request.urgency_level}
              </Badge>
            )}
          </div>

          {/* Actions */}
          {availableActions.length > 0 && !action && (
            <div className="space-y-2">
              <Label>Actions disponibles</Label>
              <div className="flex flex-wrap gap-2">
                {availableActions.map((actionItem) => {
                  const Icon = actionItem.icon;
                  return (
                    <Button
                      key={actionItem.key}
                      variant={actionItem.variant}
                      onClick={() => {
                        if (actionItem.key === 'approve') {
                          handleApprove();
                        } else {
                          setAction(actionItem.key as any);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {actionItem.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Forms */}
          {action && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {action === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="rejection_reason">Raison du rejet *</Label>
                  <Textarea
                    id="rejection_reason"
                    {...form.register('rejection_reason', { required: true })}
                    placeholder="Expliquez pourquoi cette demande est rejetée..."
                    rows={3}
                  />
                </div>
              )}

              {action === 'order' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchase_price">Prix d'achat (€) *</Label>
                      <Input
                        id="purchase_price"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register('purchase_price', { required: true, min: 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier_name">Fournisseur *</Label>
                      <Controller
                        name="supplier_name"
                        control={form.control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <SupplierAutocomplete
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Rechercher un fournisseur..."
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {action === 'ship' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tracking_number">Numéro de suivi *</Label>
                      <Input
                        id="tracking_number"
                        {...form.register('tracking_number', { required: true })}
                        placeholder="Numéro de suivi du colis"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carrier">Transporteur *</Label>
                      <Input
                        id="carrier"
                        {...form.register('carrier', { required: true })}
                        placeholder="Nom du transporteur"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setAction(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Mise à jour...' : 'Confirmer'}
                </Button>
              </div>
            </form>
          )}

          {availableActions.length === 0 && !action && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune action disponible pour ce statut.</p>
              <p className="text-sm">
                La demande sera automatiquement terminée lors du scan en stock.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}