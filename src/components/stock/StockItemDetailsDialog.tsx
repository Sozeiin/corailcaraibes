import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, TrendingUp, Wrench, User } from 'lucide-react';
import { StockItem } from '@/types';
import { PurchaseHistory } from './PurchaseHistory';
import { SupplierHistory } from './SupplierHistory';
import { PriceAnalysis } from './PriceAnalysis';
import { UsageAnalysis } from './UsageAnalysis';

interface StockItemDetailsDialogProps {
  item: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StockItemDetailsDialog({ item, isOpen, onClose }: StockItemDetailsDialogProps) {
  if (!item) return null;

  const getStockStatus = (item: StockItem) => {
    if (item.quantity === 0) {
      return { label: 'Rupture', variant: 'destructive' as const };
    } else if (item.quantity <= item.minThreshold) {
      return { label: 'Stock faible', variant: 'secondary' as const };
    } else {
      return { label: 'En stock', variant: 'default' as const };
    }
  };

  const status = getStockStatus(item);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold mb-2">
                {item.name}
              </DialogTitle>
              {item.reference && (
                <p className="text-sm text-muted-foreground mb-2">
                  Référence: {item.reference}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                {item.category && (
                  <Badge variant="outline">{item.category}</Badge>
                )}
                {item.baseName && (
                  <Badge variant="secondary">{item.baseName}</Badge>
                )}
              </div>
            </div>
            {item.photoUrl && (
              <div className="flex-shrink-0">
                <img
                  src={item.photoUrl}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg border"
                  loading="lazy"
                />
              </div>
            )}
            <div className="text-right">
              <div className="text-2xl font-bold">
                {item.quantity}
              </div>
              <div className="text-sm text-muted-foreground">
                {item.unit || 'unité(s)'}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y">
          <div>
            <p className="text-sm text-muted-foreground">Seuil minimum</p>
            <p className="font-semibold">{item.minThreshold}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Emplacement</p>
            <p className="font-semibold">{item.location || 'Non défini'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Dernier achat</p>
            <p className="font-semibold">
              {item.lastPurchaseDate 
                ? new Date(item.lastPurchaseDate).toLocaleDateString('fr-FR')
                : 'Aucun'
              }
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Dernier coût</p>
            <p className="font-semibold">
              {item.lastPurchaseCost 
                ? `${item.lastPurchaseCost.toFixed(2)} €`
                : 'Non défini'
              }
            </p>
          </div>
        </div>

        <Tabs defaultValue="purchases" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Achats
            </TabsTrigger>
            <TabsTrigger value="supplier" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Fournisseur
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analyse
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Utilisation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="mt-6">
            <PurchaseHistory stockItemId={item.id} />
          </TabsContent>

          <TabsContent value="supplier" className="mt-6">
            <SupplierHistory stockItem={item} />
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            <PriceAnalysis stockItemId={item.id} />
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <UsageAnalysis stockItemId={item.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}