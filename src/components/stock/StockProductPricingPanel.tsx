import React, { useEffect, useState } from 'react';
import { Euro, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getLocalDateString, formatDateSafe } from '@/lib/dateUtils';
import { useStockProductPricing, isGlobalStockRole } from '@/hooks/useStockProducts';
import { useStockProductPrices, useAddStockProductPrice } from '@/hooks/useStockProductPrices';

interface StockProductPricingPanelProps {
  productId?: string;
}

/**
 * Tarifs et fournisseurs pratiqués sur toutes les bases — visible par tous les rôles.
 * Les rôles direction / administratif / chef de base peuvent saisir un nouveau tarif
 * en précisant la base de saisie.
 */
export function StockProductPricingPanel({ productId }: StockProductPricingPanelProps) {
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useStockProductPricing(productId);
  const { data: prices = [], isLoading: isLoadingPrices } = useStockProductPrices(productId);
  const addPrice = useAddStockProductPrice();

  const canAddPrice = ['direction', 'administratif', 'chef_base'].includes(user?.role || '');
  const canChooseBase = isGlobalStockRole(user?.role);

  const [showForm, setShowForm] = useState(false);
  const [baseId, setBaseId] = useState<string>(user?.baseId || '');
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierReference, setSupplierReference] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [minimumQuantity, setMinimumQuantity] = useState('1');
  const [priceDate, setPriceDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!canChooseBase && user?.baseId) setBaseId(user.baseId);
  }, [canChooseBase, user?.baseId]);

  const { data: bases = [] } = useQuery({
    queryKey: ['bases-simple'],
    enabled: showForm,
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-simple'],
    enabled: showForm,
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const formatPrice = (value?: number | null) =>
    value != null ? `${Number(value).toFixed(2)} €` : '-';

  const resetForm = () => {
    setSupplierId('');
    setSupplierReference('');
    setUnitPrice('');
    setMinimumQuantity('1');
    setPriceDate(getLocalDateString());
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!productId) return;
    const price = Number(unitPrice);
    if (!unitPrice || isNaN(price) || price < 0) {
      toast({ title: 'Prix invalide', description: 'Saisissez un prix unitaire valide.', variant: 'destructive' });
      return;
    }
    if (!baseId) {
      toast({ title: 'Base manquante', description: 'Indiquez la base de saisie du tarif.', variant: 'destructive' });
      return;
    }

    try {
      await addPrice.mutateAsync({
        productId,
        baseId,
        supplierId: supplierId || null,
        supplierReference,
        unitPrice: price,
        minimumQuantity: Number(minimumQuantity) || 1,
        priceDate,
        notes,
      });
      toast({ title: 'Tarif enregistré', description: 'Le nouveau tarif a été ajouté à la fiche produit.' });
      resetForm();
      setShowForm(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || "Impossible d'enregistrer le tarif",
        variant: 'destructive',
      });
    }
  };

  if (!productId) {
    return <p className="text-sm text-muted-foreground">Aucune fiche produit associée.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Euro className="h-4 w-4" />
            Tarifs saisis (toutes bases)
          </div>
          {canAddPrice && (
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" />
              {showForm ? 'Fermer' : 'Ajouter un tarif'}
            </Button>
          )}
        </div>

        {showForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Base de saisie</Label>
                {canChooseBase ? (
                  <Select value={baseId} onValueChange={setBaseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une base" />
                    </SelectTrigger>
                    <SelectContent>
                      {bases.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    readOnly
                    value={bases.find((b: any) => b.id === baseId)?.name || 'Ma base'}
                  />
                )}
              </div>

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
                <Label htmlFor="new-price">Prix unitaire (€)</Label>
                <Input
                  id="new-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-price-date">Date du tarif</Label>
                <Input
                  id="new-price-date"
                  type="date"
                  value={priceDate}
                  onChange={(e) => setPriceDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-supplier-ref">Référence fournisseur</Label>
                <Input
                  id="new-supplier-ref"
                  value={supplierReference}
                  onChange={(e) => setSupplierReference(e.target.value)}
                  placeholder="Ex : REF-12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-min-qty">Quantité minimum</Label>
                <Input
                  id="new-min-qty"
                  type="number"
                  min="1"
                  value={minimumQuantity}
                  onChange={(e) => setMinimumQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-price-notes">Note (optionnel)</Label>
              <Input
                id="new-price-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Devis, remise, conditions..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={addPrice.isPending}>
                {addPrice.isPending ? 'Enregistrement...' : 'Enregistrer le tarif'}
              </Button>
            </div>
          </div>
        )}

        {isLoadingPrices ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-marine-600" />
          </div>
        ) : prices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun tarif saisi pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Base de saisie</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Réf. fournisseur</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-center">Qté min.</TableHead>
                  <TableHead>Saisi par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell>{formatDateSafe(price.price_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{price.base_name || 'Non précisée'}</Badge>
                    </TableCell>
                    <TableCell>{price.supplier_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{price.supplier_reference || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(price.unit_price)}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{price.minimum_quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{price.created_by_name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Euro className="h-4 w-4" />
          Tarifs de référence par emplacement
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-marine-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun tarif de référence enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emplacement</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Réf. fournisseur</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Dernier coût</TableHead>
                  <TableHead>Dernier achat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.stock_item_id}>
                    <TableCell className="font-medium">{row.base_name || '-'}</TableCell>
                    <TableCell>{row.supplier_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.supplier_reference || '-'}</TableCell>
                    <TableCell className="text-right">{formatPrice(row.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatPrice(row.last_purchase_cost)}</TableCell>
                    <TableCell>
                      {row.last_purchase_date ? formatDateSafe(row.last_purchase_date) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
