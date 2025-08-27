import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Order, Supplier, Base } from '@/types';
import { PURCHASE_WORKFLOW_STATUSES, LEGACY_WORKFLOW_STATUSES } from '@/types/workflow';
import { getStatusLabel, isWorkflowStatus } from '@/lib/workflowUtils';
import { ProductAutocomplete } from './ProductAutocomplete';
import { CreateStockItemDialog } from './CreateStockItemDialog';

interface OrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
}

interface OrderFormData {
  orderNumber: string;
  supplierId: string;
  baseId: string;
  status: string;
  orderDate: string;
  deliveryDate: string;
  items: {
    productName: string;
    reference: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export function OrderDialog({ isOpen, onClose, order }: OrderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createStockDialogOpen, setCreateStockDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  const form = useForm<OrderFormData>({
    defaultValues: {
      orderNumber: '',
      supplierId: '',
      baseId: '',
        status: 'draft',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      items: [{ productName: '', reference: '', quantity: 1, unitPrice: 0 }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      
      return data.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        category: supplier.category || '',
        baseId: supplier.base_id || '',
        createdAt: supplier.created_at || new Date().toISOString()
      })) as Supplier[];
    },
    enabled: isOpen
  });

  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('*')
        .order('name');

      if (error) throw error;
      
      return data.map(base => ({
        id: base.id,
        name: base.name,
        location: base.location,
        phone: base.phone || '',
        email: base.email || '',
        manager: base.manager || '',
        createdAt: base.created_at || new Date().toISOString()
      })) as Base[];
    },
    enabled: isOpen
  });

  useEffect(() => {
    if (order) {
      form.reset({
        orderNumber: order.orderNumber,
        supplierId: order.supplierId,
        baseId: order.baseId,
        status: order.status,
        orderDate: order.orderDate.split('T')[0],
        deliveryDate: order.deliveryDate ? order.deliveryDate.split('T')[0] : '',
        items: order.items.map(item => ({
          productName: item.productName,
          reference: item.reference || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      });
    } else {
      // Generate unique order number for new orders
      const orderNumber = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      form.reset({
        orderNumber,
        supplierId: '',
        baseId: user?.role === 'direction' ? '' : (user?.baseId || ''),
        status: 'draft',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        items: [{ productName: '', reference: '', quantity: 1, unitPrice: 0 }]
      });
    }
  }, [order, form, user]);

  const calculateTotal = (items: any[]) => {
    return items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal(data.items);
      const isPurchaseRequest = order?.isPurchaseRequest || isWorkflowStatus(data.status);

      const orderData = {
        order_number: data.orderNumber,
        supplier_id: data.supplierId || null,
        base_id: data.baseId || null,
        status: data.status,
        order_date: data.orderDate,
        delivery_date: data.deliveryDate || null,
        total_amount: totalAmount,
        is_purchase_request: isPurchaseRequest,
        requested_by: user?.id || null
      };

      let orderId = order?.id;

      if (order) {
        // Update existing order
        const { error } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', order.id);

        if (error) throw error;

        // Delete existing items
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', order.id);
      } else {
        // Create new order
        const { data: newOrder, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (error) throw error;
        orderId = newOrder.id;
      }

      // Insert items
      const itemsData = data.items.map(item => ({
        order_id: orderId,
        product_name: item.productName,
        reference: item.reference || null,
        quantity: item.quantity,
        unit_price: item.unitPrice
        // total_price is calculated automatically (generated column)
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast({
        title: order ? "Commande modifiée" : "Commande créée",
        description: order 
          ? "La commande a été mise à jour avec succès."
          : "La nouvelle commande a été créée avec succès."
      });

      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la commande.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const availableBases = user?.role === 'direction' 
    ? bases 
    : bases.filter(base => base.id === user?.baseId);

  const watchedItems = form.watch('items');
  const totalAmount = calculateTotal(watchedItems);

  const handleCreateStockItem = (productName: string) => {
    setNewProductName(productName);
    setCreateStockDialogOpen(true);
  };

  const handleStockItemCreated = (name: string, reference: string) => {
    // Find the current item being edited and update it
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.map(item => 
      item.productName === newProductName 
        ? { ...item, productName: name, reference } 
        : item
    );
    form.setValue('items', updatedItems);
    setCreateStockDialogOpen(false);
    setNewProductName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? 'Modifier la commande' : 'Nouvelle commande'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orderNumber"
                rules={{ required: "Le numéro de commande est requis" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° de commande *</FormLabel>
                    <FormControl>
                      <Input placeholder="CMD-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut / Type de commande</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le statut" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PURCHASE_WORKFLOW_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusLabel(status)}
                            </SelectItem>
                          ))}
                          {LEGACY_WORKFLOW_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fournisseur</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un fournisseur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.filter(supplier => supplier.id && supplier.id.trim() !== '').map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {availableBases.length > 0 && (
                <FormField
                  control={form.control}
                  name="baseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une base" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableBases.filter(base => base.id && base.id.trim() !== '').map((base) => (
                            <SelectItem key={base.id} value={base.id}>
                              {base.name} - {base.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orderDate"
                rules={{ required: "La date de commande est requise" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de commande *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de livraison prévue</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Articles de la commande</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productName: '', reference: '', quantity: 1, unitPrice: 0 })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un article
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productName`}
                    rules={{ required: "Le nom du produit est requis" }}
                    render={({ field: fieldProps }) => (
                      <FormItem>
                        <FormLabel>Produit *</FormLabel>
                        <FormControl>
                          <ProductAutocomplete
                            value={fieldProps.value}
                            reference={form.watch(`items.${index}.reference`)}
                            onValueChange={(productName, reference) => {
                              fieldProps.onChange(productName);
                              form.setValue(`items.${index}.reference`, reference);
                            }}
                            onCreateNew={handleCreateStockItem}
                            placeholder="Rechercher ou créer un produit..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.reference`}
                    render={({ field: fieldProps }) => (
                      <FormItem>
                        <FormLabel>Référence</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Réf. auto" 
                            {...fieldProps}
                            readOnly
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    rules={{ required: "La quantité est requise", min: 1 }}
                    render={({ field: fieldProps }) => (
                      <FormItem>
                        <FormLabel>Quantité *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...fieldProps}
                            onChange={(e) => fieldProps.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    rules={{ required: "Le prix unitaire est requis", min: 0 }}
                    render={({ field: fieldProps }) => (
                      <FormItem>
                        <FormLabel>Prix unitaire (€) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            {...fieldProps}
                            onChange={(e) => fieldProps.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="text-right">
                <p className="text-lg font-semibold">
                  Total: {totalAmount.toFixed(2)} €
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? 'Sauvegarde...' : (order ? 'Modifier' : 'Créer')}
              </Button>
            </div>
          </form>
        </Form>

        <CreateStockItemDialog
          isOpen={createStockDialogOpen}
          onClose={() => setCreateStockDialogOpen(false)}
          productName={newProductName}
          onItemCreated={handleStockItemCreated}
        />
      </DialogContent>
    </Dialog>
  );
}