import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, TrendingUp, Wrench, User, Package, Barcode, Euro } from 'lucide-react';
import { StockItem } from '@/types';
import { PurchaseHistory } from './PurchaseHistory';
import { SupplierHistory } from './SupplierHistory';
import { PriceAnalysis } from './PriceAnalysis';
import { UsageAnalysis } from './UsageAnalysis';
import { StockItemQuotes } from './StockItemQuotes';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { BarcodeDownloader } from './BarcodeDownloader';
import { QuickSupplyRequestDialog } from './QuickSupplyRequestDialog';
import { StockSupplierPriceDialog } from './StockSupplierPriceDialog';
import { useAuth } from '@/contexts/AuthContext';
import { StockProductPricingPanel } from './StockProductPricingPanel';

interface StockItemDetailsDialogProps {
  item: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StockItemDetailsDialog({ item, isOpen, onClose }: StockItemDetailsDialogProps) {
  const { user } = useAuth();
  const [isSupplyOpen, setIsSupplyOpen] = useState(false);
  const [isSupplierPriceOpen, setIsSupplierPriceOpen] = useState(false);
  const canManage = ['direction', 'chef_base', 'administratif'].includes(user?.role || '');

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
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 text-left">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-xl font-bold mb-2 break-words">
                {item.name}
              </DialogTitle>
              {item.reference && (
                <p className="text-sm text-muted-foreground mb-2">
                  Référence: {item.reference}
                </p>
              )}
              {item.supplierReference && (
                <p className="text-sm text-muted-foreground mb-2">
                  Référence fournisseur: {item.supplierReference}
                </p>
              )}
              {item.brand && (
                <p className="text-sm text-muted-foreground mb-2">
                  Marque: {item.brand}
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
            <div className="flex-shrink-0">
              <OptimizedImage
                src={item.photoUrl}
                alt={item.name}
                size="lg"
                className="hidden sm:block"
                fallbackIcon={<Package className="h-8 w-8 text-muted-foreground" />}
              />
              <OptimizedImage
                src={item.photoUrl}
                alt={item.name}
                size="md"
                className="block sm:hidden"
                fallbackIcon={<Package className="h-6 w-6 text-muted-foreground" />}
              />
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-bold">
                {item.quantity}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
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

        {canManage && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsSupplierPriceOpen(true)}>
              <Euro className="h-4 w-4 mr-2" />
              Fournisseur & tarif
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => setIsSupplyOpen(true)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              <span className="truncate">Demande d'approvisionnement</span>
            </Button>
          </div>
        )}

        <Tabs defaultValue="barcode" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 h-auto gap-1">
            <TabsTrigger value="barcode" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <Barcode className="h-4 w-4 shrink-0" />
              <span className="truncate">Code-barres</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <Euro className="h-4 w-4 shrink-0" />
              <span className="truncate">Tarifs</span>
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span className="truncate">Achats</span>
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <Package className="h-4 w-4 shrink-0" />
              <span className="truncate">Devis</span>
            </TabsTrigger>
            <TabsTrigger value="supplier" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">Fournisseur</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="truncate">Analyse</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <Wrench className="h-4 w-4 shrink-0" />
              <span className="truncate">Utilisation</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="mt-6">
            <StockProductPricingPanel productId={item.productId} />
          </TabsContent>


          <TabsContent value="barcode" className="mt-6">
            <BarcodeDownloader 
              barcode={item.barcode || item.reference || ''} 
              itemName={item.name}
              reference={item.reference}
            />
          </TabsContent>

          <TabsContent value="purchases" className="mt-6">
            <PurchaseHistory stockItemId={item.id} />
          </TabsContent>

          <TabsContent value="quotes" className="mt-6">
            <StockItemQuotes stockItem={item} />
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

        <QuickSupplyRequestDialog
          item={item}
          isOpen={isSupplyOpen}
          onClose={() => setIsSupplyOpen(false)}
        />
        <StockSupplierPriceDialog
          item={item}
          isOpen={isSupplierPriceOpen}
          onClose={() => setIsSupplierPriceOpen(false)}
        />
      </DialogContent>
    </Dialog>

  );
}