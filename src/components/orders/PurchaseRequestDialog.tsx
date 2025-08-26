import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Upload, ExternalLink, Clock, CheckCircle, XCircle, Truck, Ship } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProductAutocomplete } from './ProductAutocomplete';
import { PhotoUpload } from './PhotoUpload';
import { Order, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { isWorkflowStatus } from '@/lib/workflowUtils';

interface PurchaseRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
}

const urgencyLabels = {
  low: 'Faible',
  normal: 'Normale',
  high: 'Élevée',
  urgent: 'Urgente'
};

const urgencyColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending_approval: 'En attente d\'approbation',
  supplier_requested: 'Demande effectuée auprès du fournisseur',
  shipping_mainland: 'Commande en cours de livraison - Métropole',
  shipping_antilles: 'Commande en cours d\'envoi - Antilles',
  delivered: 'Livrée',
  cancelled: 'Annulée'
};

const statusIcons = {
  pending_approval: Clock,
  supplier_requested: CheckCircle,
  shipping_mainland: Truck,
  shipping_antilles: Ship,
  delivered: CheckCircle,
  cancelled: XCircle
};

export function PurchaseRequestDialog({ isOpen, onClose, order }: PurchaseRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    orderNumber: order?.orderNumber || '',
    boatId: order?.boatId || 'none',
    urgencyLevel: (order?.urgencyLevel || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
    requestNotes: order?.requestNotes || '',
    trackingUrl: order?.trackingUrl || '',
    photos: order?.photos || []
  });
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState({
    productName: '',
    reference: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0
  });

  // Charger les items quand le dialog s'ouvre
  React.useEffect(() => {
    if (isOpen && order?.id) {
      // Charger les items de la commande depuis la base de données
      const loadOrderItems = async () => {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        
        if (!error && data) {
          const loadedItems = data.map(item => ({
            id: item.id,
            productName: item.product_name,
            reference: item.reference || '',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price || (item.quantity * item.unit_price)
          }));
          setItems(loadedItems);
        }
      };
      loadOrderItems();
    } else if (!order) {
      // Nouveau dialog, reset les items
      setItems([]);
    }
  }, [isOpen, order?.id]);

  const isEditing = !!order;
  const canEdit = user?.role === 'direction' || user?.role === 'chef_base' || (order && order.requestedBy === user?.id && order.status === 'pending_approval');

  // Fetch boats for selection
  const { data: boats = [] } = useQuery({
    queryKey: ['boats-for-request', user?.baseId],
    queryFn: async () => {
      let query = supabase
        .from('boats')
        .select('*')
        .order('name');
      
      if (user?.role !== 'direction' && user?.baseId) {
        query = query.eq('base_id', user.baseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Create/update mutation
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        // Mettre à jour la commande
        const { data: updated, error } = await supabase
          .from('orders')
          .update(data)
          .eq('id', order.id)
          .select()
          .single();
        
        if (error) throw error;

        // Supprimer les anciens items et réinsérer les nouveaux
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', order.id);

        if (items.length > 0) {
          const orderItems = items.map(item => ({
            order_id: order.id,
            product_name: item.productName,
            reference: item.reference || null,
            quantity: item.quantity,
            unit_price: item.unitPrice
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
          
          if (itemsError) {
            console.error('Order items insertion error:', itemsError);
            throw itemsError;
          }
        }
        
        return updated;
      } else {
        // Insert new order
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert(data)
          .select()
          .single();
        
        if (orderError) {
          console.error('Order insertion error:', orderError);
          throw orderError;
        }

        // Insert order items
        if (items.length > 0) {
          const orderItems = items.map(item => ({
            order_id: newOrder.id,
            product_name: item.productName,
            reference: item.reference || null,
            quantity: item.quantity,
            unit_price: item.unitPrice
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
          
          if (itemsError) {
            console.error('Order items insertion error:', itemsError);
            throw itemsError;
          }
        }

        return newOrder;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: isEditing ? "Demande mise à jour" : "Demande créée",
        description: isEditing ? "La demande d'achat a été mise à jour avec succès." : "Votre demande d'achat a été créée avec succès.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
      console.error('Error saving purchase request:', error);
    }
  });

  const addItem = () => {
    if (!newItem.productName.trim()) return;
    
    const item: OrderItem = {
      id: `temp-${Date.now()}`,
      productName: newItem.productName,
      reference: newItem.reference,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      totalPrice: newItem.quantity * newItem.unitPrice
    };
    
    setItems([...items, item]);
    setNewItem({
      productName: '',
      reference: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter au moins un article à votre demande.",
        variant: "destructive",
      });
      return;
    }

    const isPurchaseRequest = order?.isPurchaseRequest || isWorkflowStatus(order?.status || 'pending_approval');

    const submitData = {
      boat_id: formData.boatId === 'none' ? null : formData.boatId,
      urgency_level: formData.urgencyLevel,
      request_notes: formData.requestNotes,
      tracking_url: formData.trackingUrl || null,
      photos: formData.photos,
      order_number: isEditing ? order?.orderNumber : `REQ-${Date.now().toString().slice(-6)}`,
      is_purchase_request: isPurchaseRequest,
      status: isEditing ? order?.status : 'pending_approval',
      requested_by: user?.id,
      base_id: user?.baseId,
      order_date: new Date().toISOString().split('T')[0],
      total_amount: items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    };

    

    mutation.mutate(submitData);
  };

  const StatusIcon = order ? statusIcons[order.status as keyof typeof statusIcons] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {isEditing ? `Demande d'achat ${order.orderNumber}` : 'Nouvelle demande d\'achat'}
              </DialogTitle>
              {order && (
                <div className="flex items-center gap-2 mt-2">
                  {StatusIcon && <StatusIcon className="h-4 w-4" />}
                  <span className="text-sm text-muted-foreground">
                    {statusLabels[order.status as keyof typeof statusLabels]}
                  </span>
                </div>
              )}
            </div>
            {order && (
              <Badge className={urgencyColors[order.urgencyLevel as keyof typeof urgencyColors]}>
                Urgence: {urgencyLabels[order.urgencyLevel as keyof typeof urgencyLabels]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Boat Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="boat">Bateau concerné</Label>
              <Select
                value={formData.boatId || 'none'}
                onValueChange={(value) => setFormData({...formData, boatId: value})}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bateau ou 'Pièce détachée'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pièce détachée (sans bateau spécifique)</SelectItem>
                  {boats.map((boat) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.name} - {boat.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="urgency">Niveau d'urgence</Label>
              <Select
                value={formData.urgencyLevel}
                onValueChange={(value) => setFormData({...formData, urgencyLevel: value as 'low' | 'normal' | 'high' | 'urgent'})}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Articles */}
          <div>
            <Label className="text-base font-medium">Articles demandés</Label>
            
            {canEdit && (
              <Card className="mt-2">
                <CardContent className="p-4">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">Produit</Label>
                      <ProductAutocomplete
                        value={newItem.productName}
                        reference={newItem.reference}
                        onValueChange={(productName, reference) => 
                          setNewItem({...newItem, productName, reference})
                        }
                        placeholder="Rechercher ou saisir..."
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Référence</Label>
                      <Input
                        value={newItem.reference}
                        onChange={(e) => setNewItem({...newItem, reference: e.target.value})}
                        placeholder="Réf..."
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Quantité</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Prix unitaire (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        onClick={addItem}
                        disabled={!newItem.productName.trim()}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items List */}
            <div className="space-y-2 mt-4">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    {item.reference && (
                      <div className="text-sm text-muted-foreground">Réf: {item.reference}</div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mr-4">
                    Qté: {item.quantity} • {item.unitPrice.toFixed(2)}€ • Total: {item.totalPrice.toFixed(2)}€
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <Label className="text-base font-medium">Photos des pièces</Label>
            <PhotoUpload
              photos={formData.photos}
              onPhotosChange={(photos) => setFormData({...formData, photos})}
              disabled={!canEdit}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes et précisions</Label>
            <Textarea
              value={formData.requestNotes}
              onChange={(e) => setFormData({...formData, requestNotes: e.target.value})}
              placeholder="Précisions sur la demande, urgence, contexte..."
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {/* Tracking URL - Only for direction and certain statuses */}
          {user?.role === 'direction' && order && ['shipping_mainland', 'shipping_antilles'].includes(order.status) && (
            <div>
              <Label htmlFor="tracking">URL de suivi transporteur</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.trackingUrl}
                  onChange={(e) => setFormData({...formData, trackingUrl: e.target.value})}
                  placeholder="https://..."
                />
                {formData.trackingUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(formData.trackingUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            {canEdit && (
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer la demande'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}