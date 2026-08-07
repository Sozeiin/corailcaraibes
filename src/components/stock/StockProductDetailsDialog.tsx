import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Euro, ShoppingCart, Edit, Copy, Barcode } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { StockProduct, StockProductLevel } from '@/hooks/useStockProducts';
import { StockProductPricingPanel } from './StockProductPricingPanel';
import { BarcodeDownloader } from './BarcodeDownloader';
import { PurchaseHistory } from './PurchaseHistory';
import { useAuth } from '@/contexts/AuthContext';

interface StockProductDetailsDialogProps {
  product: StockProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onEditLevel?: (level: StockProductLevel) => void;
  onAddLocation?: (product: StockProduct) => void;
  onRequestPurchase?: (level: StockProductLevel) => void;
}

export function StockProductDetailsDialog({
  product,
  isOpen,
  onClose,
  onEditLevel,
  onAddLocation,
  onRequestPurchase,
}: StockProductDetailsDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('locations');
  const canManage = ['direction', 'chef_base', 'administratif'].includes(user?.role || '');

  if (!product) return null;

  const isLow = product.totalQuantity <= product.totalThreshold;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold mb-2">{product.name}</DialogTitle>
              {product.reference && (
                <p className="text-sm text-muted-foreground">Référence : {product.reference}</p>
              )}
              {product.brand && (
                <p className="text-sm text-muted-foreground">Marque : {product.brand}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant={product.totalQuantity === 0 ? 'destructive' : isLow ? 'secondary' : 'default'}>
                  {product.totalQuantity === 0 ? 'Rupture' : isLow ? 'Stock faible' : 'En stock'}
                </Badge>
                {product.category && <Badge variant="outline">{product.category}</Badge>}
                <Badge variant="secondary">
                  {product.levels.length} emplacement{product.levels.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            <OptimizedImage
              src={product.photoUrl}
              alt={product.name}
              size="lg"
              className="hidden sm:block flex-shrink-0"
              fallbackIcon={<Package className="h-8 w-8 text-muted-foreground" />}
            />
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold">{product.totalQuantity}</div>
              <div className="text-sm text-muted-foreground">{product.unit || 'unité(s)'} au total</div>
            </div>
          </div>
        </DialogHeader>

        {canManage && onAddLocation && (
          <div className="pt-2">
            <Button variant="outline" onClick={() => onAddLocation(product)}>
              <Copy className="h-4 w-4 mr-2" />
              Ajouter cet article à une autre base
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Emplacements
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Tarifs & fournisseurs
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Achats
            </TabsTrigger>
            <TabsTrigger value="barcode" className="flex items-center gap-2">
              <Barcode className="h-4 w-4" />
              Code-barres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="mt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emplacement</TableHead>
                    <TableHead className="text-center">Quantité</TableHead>
                    <TableHead className="text-center">Seuil min.</TableHead>
                    <TableHead>Détail emplacement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.levels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.baseName || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className={level.quantity <= level.minThreshold ? 'text-orange-600 font-semibold' : 'font-semibold'}>
                          {level.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{level.minThreshold}</TableCell>
                      <TableCell className="text-muted-foreground">{level.location || 'Non défini'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {onRequestPurchase && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-marine-600"
                              title="Demande d'approvisionnement"
                              onClick={() => onRequestPurchase(level)}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          {canManage && onEditLevel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Modifier"
                              onClick={() => onEditLevel(level)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <StockProductPricingPanel productId={product.productId} />
          </TabsContent>

          <TabsContent value="purchases" className="mt-6">
            <div className="space-y-6">
              {product.levels.map((level) => (
                <div key={level.id}>
                  <p className="text-sm font-medium mb-2">{level.baseName}</p>
                  <PurchaseHistory stockItemId={level.id} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="barcode" className="mt-6">
            <BarcodeDownloader
              barcode={product.barcode || product.reference || ''}
              itemName={product.name}
              reference={product.reference}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
