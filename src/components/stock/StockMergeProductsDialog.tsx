import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Merge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { StockProduct } from '@/hooks/useStockProducts';

interface StockMergeProductsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  products: StockProduct[];
}

const normalize = (value?: string) =>
  (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function StockMergeProductsDialog({ isOpen, onClose, products }: StockMergeProductsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [keepByGroup, setKeepByGroup] = useState<Record<string, string>>({});
  const [mergingGroup, setMergingGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byKey = new Map<string, StockProduct[]>();
    products.forEach((product) => {
      const key = normalize(product.reference) || normalize(product.name);
      if (!key) return;
      const list = byKey.get(key) || [];
      list.push(product);
      byKey.set(key, list);
    });
    return Array.from(byKey.entries())
      .filter(([, list]) => list.length > 1)
      .sort((a, b) => a[1][0].name.localeCompare(b[1][0].name));
  }, [products]);

  const handleMerge = async (key: string, list: StockProduct[]) => {
    const keepId = keepByGroup[key] || list[0].productId;
    setMergingGroup(key);
    try {
      const { error } = await (supabase as any).rpc('merge_stock_products', {
        keep_id: keepId,
        merge_ids: list.map((p) => p.productId),
      });
      if (error) throw error;
      toast({
        title: 'Fiches fusionnées',
        description: `${list.length} fiches regroupées sur « ${list.find((p) => p.productId === keepId)?.name} ».`,
      });
      queryClient.invalidateQueries({ queryKey: ['stock-products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
    } catch (error: any) {
      toast({
        title: 'Erreur de fusion',
        description: error?.message || 'Impossible de fusionner ces fiches',
        variant: 'destructive',
      });
    } finally {
      setMergingGroup(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Fusionner des fiches produit
          </DialogTitle>
          <DialogDescription>
            Doublons probables (même référence ou même nom). Choisissez la fiche à conserver : les stocks
            des autres fiches y sont rattachés, puis les fiches vidées sont supprimées.
          </DialogDescription>
        </DialogHeader>

        {groups.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Aucun doublon détecté.</p>
        ) : (
          <div className="space-y-6">
            {groups.map(([key, list]) => (
              <div key={key} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{list[0].name}</p>
                  <Badge variant="secondary">{list.length} fiches</Badge>
                </div>
                <RadioGroup
                  value={keepByGroup[key] || list[0].productId}
                  onValueChange={(value) => setKeepByGroup((prev) => ({ ...prev, [key]: value }))}
                  className="space-y-2"
                >
                  {list.map((product) => (
                    <div key={product.productId} className="flex items-start gap-2">
                      <RadioGroupItem value={product.productId} id={product.productId} className="mt-1" />
                      <Label htmlFor={product.productId} className="font-normal cursor-pointer">
                        <span className="font-medium">{product.name}</span>
                        {product.reference && (
                          <span className="text-muted-foreground"> — réf. {product.reference}</span>
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {product.levels.map((l) => `${l.baseName || 'Sans base'} : ${l.quantity}`).join(' · ')}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <Button
                  size="sm"
                  onClick={() => handleMerge(key, list)}
                  disabled={mergingGroup === key}
                >
                  {mergingGroup === key ? 'Fusion...' : 'Fusionner ce groupe'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
