import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ClipboardList, Search, Package } from 'lucide-react';
import { StockItem } from '@/types';
import { useValidateInventory, InventoryCountLine } from '@/hooks/useStockInventory';

interface BaseOption {
  id: string;
  name: string;
}

interface StockInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockItem[];
  bases: BaseOption[];
  userRole?: string;
  userBaseId?: string;
}

export function StockInventoryDialog({
  isOpen,
  onClose,
  items,
  bases,
  userRole,
  userBaseId,
}: StockInventoryDialogProps) {
  const isDirection = userRole === 'direction';
  const [selectedBase, setSelectedBase] = useState<string>(userBaseId || (bases[0]?.id ?? ''));
  const [searchTerm, setSearchTerm] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const validateInventory = useValidateInventory();

  // Base verrouillée pour les non-direction
  const effectiveBase = isDirection ? selectedBase : (userBaseId || selectedBase);

  const baseItems = useMemo(
    () => items.filter((item) => item.baseId === effectiveBase),
    [items, effectiveBase]
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm) return baseItems;
    const q = searchTerm.toLowerCase();
    return baseItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.reference?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q)
    );
  }, [baseItems, searchTerm]);

  const countedLines: InventoryCountLine[] = useMemo(() => {
    return baseItems
      .map((item) => {
        const raw = counts[item.id];
        if (raw === undefined || raw === '') return null;
        const countedQty = Number(raw);
        if (Number.isNaN(countedQty)) return null;
        return {
          stockItemId: item.id,
          itemName: item.name,
          itemReference: item.reference || null,
          baseId: item.baseId,
          theoreticalQty: item.quantity,
          countedQty,
        } as InventoryCountLine;
      })
      .filter(Boolean) as InventoryCountLine[];
  }, [baseItems, counts]);

  const countedTotal = countedLines.length;
  const diffTotal = countedLines.filter((l) => l.countedQty !== l.theoreticalQty).length;

  const handleCountChange = (itemId: string, value: string) => {
    setCounts((prev) => ({ ...prev, [itemId]: value }));
  };

  const resetState = () => {
    setCounts({});
    setSearchTerm('');
  };

  const handleClose = () => {
    if (validateInventory.isPending) return;
    resetState();
    onClose();
  };

  const handleValidate = () => {
    validateInventory.mutate(countedLines, {
      onSuccess: () => {
        setConfirmOpen(false);
        resetState();
        onClose();
      },
    });
  };

  const getDiff = (item: StockItem) => {
    const raw = counts[item.id];
    if (raw === undefined || raw === '') return null;
    const counted = Number(raw);
    if (Number.isNaN(counted)) return null;
    return counted - item.quantity;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Inventaire du stock
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pt-2 space-y-3 border-b pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Base</Label>
                <Select
                  value={effectiveBase}
                  onValueChange={setSelectedBase}
                  disabled={!isDirection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une base" />
                  </SelectTrigger>
                  <SelectContent>
                    {bases.map((base) => (
                      <SelectItem key={base.id} value={base.id}>
                        {base.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Nom, référence, emplacement..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">{baseItems.length} article(s)</Badge>
              <Badge variant="default">{countedTotal} compté(s)</Badge>
              {diffTotal > 0 && <Badge variant="destructive">{diffTotal} écart(s)</Badge>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="mx-auto h-10 w-10 mb-3 opacity-50" />
                <p>Aucun article pour cette base.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* En-tête desktop */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
                  <div className="col-span-5">Article</div>
                  <div className="col-span-2 text-center">Théorique</div>
                  <div className="col-span-3 text-center">Comptée</div>
                  <div className="col-span-2 text-center">Écart</div>
                </div>
                {filteredItems.map((item) => {
                  const diff = getDiff(item);
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center border rounded-lg p-2 hover:bg-muted/40"
                    >
                      <div className="col-span-12 sm:col-span-5 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.reference && <span>Réf: {item.reference} </span>}
                          {item.location && <span>· 📍 {item.location}</span>}
                        </p>
                      </div>
                      <div className="col-span-4 sm:col-span-2 text-center">
                        <span className="sm:hidden text-xs text-muted-foreground">Théorique: </span>
                        <span className="font-semibold">{item.quantity}</span>
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="—"
                          value={counts[item.id] ?? ''}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
                          className="h-9 text-center"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2 text-center">
                        {diff === null ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : diff === 0 ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">0</Badge>
                        ) : (
                          <Badge variant="destructive">
                            {diff > 0 ? `+${diff}` : diff}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4 flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={validateInventory.isPending}>
              Annuler
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={countedTotal === 0 || validateInventory.isPending}
            >
              Valider l'inventaire ({countedTotal})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'inventaire</AlertDialogTitle>
            <AlertDialogDescription>
              {countedTotal} article(s) seront mis à jour selon les quantités comptées,
              dont <strong>{diffTotal}</strong> avec un écart. Les articles non saisis
              ne seront pas modifiés. Cette action met à jour le stock et enregistre
              l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={validateInventory.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleValidate} disabled={validateInventory.isPending}>
              {validateInventory.isPending ? 'Validation...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
