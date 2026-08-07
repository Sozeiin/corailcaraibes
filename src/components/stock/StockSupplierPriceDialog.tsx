import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { StockItem } from '@/types';
import { getLocalDateString } from '@/lib/dateUtils';

interface StockSupplierPriceDialogProps {
  item: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StockSupplierPriceDialog({ item, isOpen, onClose }: StockSupplierPriceDialogProps) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierReference, setSupplierReference] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(getLocalDateString());

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-simple'],
    enabled: isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (isOpen && item) {
      setSupplierId(item.lastSupplierId || '');
      setSupplierReference(item.supplierReference || '');
      setUnitPrice(item.lastPurchaseCost != null ? String(item.lastPurchaseCost) : '');
      setPurchaseDate(item.lastPurchaseDate ? String(item.lastPurchaseDate).slice(0, 10) : getLocalDateString());
    }
  }, [isOpen, item]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error('Aucun article sélectionné');
      const price = unitPrice === '' ? null : Number(unitPrice);
      if (price !== null && (isNaN(price) || price < 0)) {
        throw new Error('Prix unitaire invalide');
      }

      const payload: Record<string, any> = {
        last_supplier_id: supplierId || null,
        supplier_reference: supplierReference || null,
        last_updated: new Date().toISOString(),
      };
      if (price !== null) {
        payload.unit_price = price;
        payload.last_purchase_cost = price;
        payload.last_purchase_date = purchaseDate || getLocalDateString();
      }

      const { error } = await supabase.from('stock_items').update(payload).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Fiche mise à jour', description: 'Fournisseur et tarif enregistrés.' });
      queryClient.invalidateQueries({ queryKey: ['stock_items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-history'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || "Impossible d'enregistrer",
        variant: 'destructive',
      });
    },
  });

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fournisseur et tarif — {item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-ref">Référence fournisseur</Label>
            <Input
              id="supplier-ref"
              value={supplierReference}
              onChange={(e) => setSupplierReference(e.target.value)}
              placeholder="Ex: REF-12345"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="unit-price">Prix unitaire (€)</Label>
              <Input
                id="unit-price"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-date">Date du tarif</Label>
              <Input
                id="price-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
