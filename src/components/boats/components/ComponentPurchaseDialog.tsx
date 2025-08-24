import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ComponentPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  componentId: string;
}

interface PurchaseFormData {
  supplierId: string;
  stockItemId: string;
  purchaseDate: Date | undefined;
  unitCost: number;
  quantity: number;
  warrantyMonths: number;
  invoiceReference: string;
  installationDate: Date | undefined;
  notes: string;
}

export function ComponentPurchaseDialog({ isOpen, onClose, componentId }: ComponentPurchaseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<PurchaseFormData>({
    supplierId: '',
    stockItemId: '',
    purchaseDate: new Date(),
    unitCost: 0,
    quantity: 1,
    warrantyMonths: 0,
    invoiceReference: '',
    installationDate: undefined,
    notes: ''
  });

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

  // Fetch stock items
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const { error } = await supabase
        .from('component_purchase_history')
        .insert({
          component_id: componentId,
          supplier_id: data.supplierId || null,
          stock_item_id: data.stockItemId || null,
          purchase_date: data.purchaseDate?.toISOString().split('T')[0],
          unit_cost: data.unitCost,
          quantity: data.quantity,
          warranty_months: data.warrantyMonths,
          invoice_reference: data.invoiceReference || null,
          installation_date: data.installationDate?.toISOString().split('T')[0] || null,
          notes: data.notes || null
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Achat enregistré",
        description: "L'achat a été enregistré avec succès."
      });
      queryClient.invalidateQueries({ queryKey: ['component-purchase-history', componentId] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'achat.",
        variant: "destructive"
      });
      console.error('Error creating purchase:', error);
    }
  });

  const resetForm = () => {
    setFormData({
      supplierId: '',
      stockItemId: '',
      purchaseDate: new Date(),
      unitCost: 0,
      quantity: 1,
      warrantyMonths: 0,
      invoiceReference: '',
      installationDate: undefined,
      notes: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPurchaseMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enregistrer un achat</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur</Label>
              <Select
                value={formData.supplierId}
                onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Item */}
            <div className="space-y-2">
              <Label htmlFor="stockItem">Article en stock</Label>
              <Select
                value={formData.stockItemId}
                onValueChange={(value) => setFormData({ ...formData, stockItemId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un article" />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} {item.reference && `(${item.reference})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purchase Date */}
            <div className="space-y-2">
              <Label>Date d'achat</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.purchaseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.purchaseDate ? (
                      format(formData.purchaseDate, "dd/MM/yyyy", { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.purchaseDate}
                    onSelect={(date) => setFormData({ ...formData, purchaseDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Installation Date */}
            <div className="space-y-2">
              <Label>Date d'installation</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.installationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.installationDate ? (
                      format(formData.installationDate, "dd/MM/yyyy", { locale: fr })
                    ) : (
                      <span>Optionnel</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.installationDate}
                    onSelect={(date) => setFormData({ ...formData, installationDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Unit Cost */}
            <div className="space-y-2">
              <Label htmlFor="unitCost">Prix unitaire (€)</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                required
              />
            </div>

            {/* Warranty */}
            <div className="space-y-2">
              <Label htmlFor="warranty">Garantie (mois)</Label>
              <Input
                id="warranty"
                type="number"
                min="0"
                value={formData.warrantyMonths}
                onChange={(e) => setFormData({ ...formData, warrantyMonths: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Invoice Reference */}
            <div className="space-y-2">
              <Label htmlFor="invoice">Référence facture</Label>
              <Input
                id="invoice"
                value={formData.invoiceReference}
                onChange={(e) => setFormData({ ...formData, invoiceReference: e.target.value })}
              />
            </div>
          </div>

          {/* Total Cost (calculated) */}
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-base font-medium">
              Coût total: {(formData.unitCost * formData.quantity).toFixed(2)} €
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={createPurchaseMutation.isPending}
            >
              {createPurchaseMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}