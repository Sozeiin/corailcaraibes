import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, DollarSign, FileText, CheckCircle, Calculator } from 'lucide-react';
import { Order } from '@/types';

interface SupplierPriceFormProps {
  order: Order;
  onComplete: () => void;
}

interface OrderItemWithPrice {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number | null;
  reference: string | null;
  negotiated_price?: number;
}

interface Supplier {
  id: string;
  name: string;
  category: string | null;
  email: string | null;
  phone: string | null;
}

export const SupplierPriceForm: React.FC<SupplierPriceFormProps> = ({ order, onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, category, email, phone')
        .order('name');
      
      if (error) throw error;
      return data as Supplier[];
    }
  });

  // Fetch order items
  const { data: orderItems = [] } = useQuery({
    queryKey: ['order-items', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      if (error) throw error;
      return data as OrderItemWithPrice[];
    }
  });

  // Initialize item prices when order items are loaded
  React.useEffect(() => {
    if (orderItems.length > 0) {
      const initialPrices: Record<string, number> = {};
      orderItems.forEach(item => {
        initialPrices[item.id] = item.unit_price || 0;
      });
      setItemPrices(initialPrices);
    }
  }, [orderItems]);

  const confirmOrderMutation = useMutation({
    mutationFn: async () => {
      // 1. Update order with selected supplier
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          supplier_id: selectedSupplierId,
          // Calculate new total based on negotiated prices
          total_amount: Object.entries(itemPrices).reduce((total, [itemId, price]) => {
            const item = orderItems.find(i => i.id === itemId);
            return total + (price * (item?.quantity || 0));
          }, 0)
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // 2. Update order items with negotiated prices
      for (const [itemId, price] of Object.entries(itemPrices)) {
        const item = orderItems.find(i => i.id === itemId);
        if (item) {
          const { error: itemError } = await supabase
            .from('order_items')
            .update({ 
              unit_price: price,
              total_price: price * item.quantity
            })
            .eq('id', itemId);

          if (itemError) throw itemError;
        }
      }

      // 3. Advance workflow to order_confirmed
      const { error: workflowError } = await supabase.rpc('advance_workflow_step', {
        order_id_param: order.id,
        new_status: 'order_confirmed',
        user_id_param: user?.id,
        notes_param: negotiationNotes || 'Prix négociés et fournisseur sélectionné'
      });

      if (workflowError) throw workflowError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', order.id] });
      toast({
        title: "Fournisseur et prix confirmés",
        description: "La commande a été mise à jour avec les prix négociés.",
      });
      onComplete();
    },
    onError: (error) => {
      console.error('Error confirming supplier and prices:', error);
      toast({
        title: "Erreur",
        description: "Impossible de confirmer le fournisseur et les prix.",
        variant: "destructive",
      });
    }
  });

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const totalAmount = Object.entries(itemPrices).reduce((total, [itemId, price]) => {
    const item = orderItems.find(i => i.id === itemId);
    return total + (price * (item?.quantity || 0));
  }, 0);

  const originalTotal = orderItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
  const savings = originalTotal - totalAmount;

  const handleItemPriceChange = (itemId: string, newPrice: number) => {
    setItemPrices(prev => ({
      ...prev,
      [itemId]: newPrice
    }));
  };

  const isFormValid = selectedSupplierId && Object.keys(itemPrices).length === orderItems.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Sélection du fournisseur et négociation des prix</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Fournisseur sélectionné *</Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un fournisseur..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{supplier.name}</span>
                      {supplier.category && (
                        <span className="text-sm text-muted-foreground">{supplier.category}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedSupplier && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium">{selectedSupplier.name}</h4>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                  {selectedSupplier.category && (
                    <span>Catégorie: {selectedSupplier.category}</span>
                  )}
                  {selectedSupplier.email && (
                    <span>Email: {selectedSupplier.email}</span>
                  )}
                  {selectedSupplier.phone && (
                    <span>Tél: {selectedSupplier.phone}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Price Negotiation */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Prix négociés</h3>
            </div>
            
            <div className="space-y-3">
              {orderItems.map(item => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      {item.reference && (
                        <p className="text-sm text-muted-foreground">Réf: {item.reference}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Quantité: {item.quantity} | Prix initial: {item.unit_price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {item.quantity} x {(itemPrices[item.id] || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Label htmlFor={`price-${item.id}`}>Prix négocié unitaire</Label>
                      <Input
                        id={`price-${item.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={itemPrices[item.id] || ''}
                        onChange={(e) => handleItemPriceChange(item.id, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total ligne</p>
                      <p className="font-semibold">
                        {((itemPrices[item.id] || 0) * item.quantity).toLocaleString('fr-FR', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Résumé de la négociation</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total initial</p>
                <p className="text-lg font-semibold">
                  {originalTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total négocié</p>
                <p className="text-lg font-semibold text-primary">
                  {totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Économie</p>
                <p className={`text-lg font-semibold ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {savings >= 0 ? '+' : ''}{savings.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            </div>
          </div>

          {/* Negotiation Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes de négociation</Label>
            <Textarea
              id="notes"
              value={negotiationNotes}
              onChange={(e) => setNegotiationNotes(e.target.value)}
              placeholder="Ajoutez des détails sur la négociation, les conditions obtenues, etc..."
              rows={3}
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button 
              onClick={() => confirmOrderMutation.mutate()}
              disabled={!isFormValid || confirmOrderMutation.isPending}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>
                {confirmOrderMutation.isPending ? 'Confirmation...' : 'Confirmer fournisseur et prix'}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};