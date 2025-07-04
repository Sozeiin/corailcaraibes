import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Order, BulkPurchaseTemplate } from '@/types';

interface BulkPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
}

interface OrderItemForm {
  productName: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

export function BulkPurchaseDialog({ isOpen, onClose, order }: BulkPurchaseDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    supplierId: '',
    orderNumber: '',
    bulkPurchaseType: 'annual',
    expectedDeliveryDate: '',
    notes: ''
  });

  // Generate unique order number on dialog open and reset form on close
  useEffect(() => {
    if (isOpen && !order) {
      const generateOrderNumber = () => {
        const timestamp = Date.now().toString().slice(-6);
        return `CMD-BULK-${timestamp}`;
      };
      setFormData({
        supplierId: '',
        orderNumber: generateOrderNumber(),
        bulkPurchaseType: 'annual',
        expectedDeliveryDate: '',
        notes: ''
      });
      setItems([{ productName: '', quantity: 0, unitPrice: 0, category: '' }]);
      setUseTemplate(false);
      setSelectedTemplateId('');
    }
  }, [isOpen, order]);
  
  const [items, setItems] = useState<OrderItemForm[]>([
    { productName: '', quantity: 0, unitPrice: 0, category: '' }
  ]);
  
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['bulk-purchase-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_purchase_templates')
        .select(`
          *,
          bulk_purchase_template_items(*)
        `)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data.map(template => ({
        ...template,
        isActive: template.is_active,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
        items: template.bulk_purchase_template_items.map(item => ({
          ...item,
          templateId: item.template_id,
          productName: item.product_name,
          estimatedQuantity: item.estimated_quantity,
          estimatedUnitPrice: item.estimated_unit_price,
          createdAt: item.created_at
        }))
      })) as BulkPurchaseTemplate[];
    }
  });

  // Load template items when template is selected
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template?.items) {
        setItems(template.items.map(item => ({
          productName: item.productName,
          quantity: item.estimatedQuantity,
          unitPrice: item.estimatedUnitPrice,
          category: item.category || ''
        })));
        if (template.supplierId) {
          setFormData(prev => ({ ...prev, supplierId: template.supplierId! }));
        }
      }
    }
  }, [selectedTemplateId, templates]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          supplier_id: formData.supplierId,
          base_id: user?.baseId,
          order_number: formData.orderNumber,
          status: 'pending',
          total_amount: totalAmount,
          order_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: formData.expectedDeliveryDate,
          is_bulk_purchase: true,
          bulk_purchase_type: formData.bulkPurchaseType,
          notes: formData.notes,
          distribution_status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return orderData;
    },
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: 'Achat groupé créé avec succès'
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la création de l\'achat groupé',
        variant: 'destructive'
      });
    }
  });

  const addItem = () => {
    setItems([...items, { productName: '', quantity: 0, unitPrice: 0, category: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItemForm, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.orderNumber || items.some(item => !item.productName)) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      });
      return;
    }
    createOrderMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel Achat Groupé</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-template"
                checked={useTemplate}
                onCheckedChange={(checked) => setUseTemplate(checked === true)}
              />
              <Label htmlFor="use-template">Utiliser un modèle</Label>
            </div>
            
            {useTemplate && (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} - {template.frequency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur *</Label>
              <Select
                value={formData.supplierId}
                onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter(supplier => supplier?.id && supplier.name).map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderNumber">Numéro de commande *</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                placeholder="CMD-2025-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkPurchaseType">Type d'achat</Label>
              <Select
                value={formData.bulkPurchaseType}
                onValueChange={(value) => setFormData({ ...formData, bulkPurchaseType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annuel</SelectItem>
                  <SelectItem value="quarterly">Trimestriel</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDeliveryDate">Date de livraison prévue</Label>
              <Input
                id="expectedDeliveryDate"
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">Articles</Label>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un article
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Nom du produit *</Label>
                  <Input
                    value={item.productName}
                    onChange={(e) => updateItem(index, 'productName', e.target.value)}
                    placeholder="Nom du produit"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Prix unitaire (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Input
                    value={item.category}
                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                    placeholder="Catégorie"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Actions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
              rows={3}
            />
          </div>

          {/* Total */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-right">
              <span className="text-lg font-semibold">
                Total: {items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)} €
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={createOrderMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createOrderMutation.isPending ? 'Création...' : 'Créer l\'achat groupé'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}