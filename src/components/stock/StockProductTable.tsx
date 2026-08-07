import React from 'react';
import { Package, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { StockProduct } from '@/hooks/useStockProducts';

interface StockProductTableProps {
  products: StockProduct[];
  bases: Array<{ id: string; name: string }>;
  isLoading: boolean;
  onViewDetails: (product: StockProduct) => void;
  onRequestPurchase?: (product: StockProduct) => void;
  canRequestPurchase?: boolean;
  /** when set, only this base column is displayed */
  filteredBaseId?: string;
}

/**
 * Vue multi-emplacements : une ligne par fiche produit, une colonne de quantité par base.
 */
export function StockProductTable({
  products,
  bases,
  isLoading,
  onViewDetails,
  onRequestPurchase,
  canRequestPurchase,
  filteredBaseId,
}: StockProductTableProps) {
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun article en stock</h3>
        <p className="text-gray-500">Commencez par ajouter vos premiers articles.</p>
      </div>
    );
  }

  const visibleBases = filteredBaseId && filteredBaseId !== 'all'
    ? bases.filter((b) => b.id === filteredBaseId)
    : bases;

  const quantityFor = (product: StockProduct, baseId: string) =>
    product.levels.find((l) => l.baseId === baseId);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[240px]">Article</TableHead>
            <TableHead className="hidden sm:table-cell">Référence</TableHead>
            <TableHead className="hidden md:table-cell">Catégorie</TableHead>
            {visibleBases.map((base) => (
              <TableHead key={base.id} className="text-center whitespace-nowrap">
                {base.name}
              </TableHead>
            ))}
            <TableHead className="text-center">Total</TableHead>
            <TableHead className="text-center">Statut</TableHead>
            {canRequestPurchase && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const isLow = product.totalQuantity <= product.totalThreshold;
            return (
              <TableRow
                key={product.productId}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => onViewDetails(product)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <OptimizedImage
                      src={product.photoUrl}
                      alt={product.name}
                      size="sm"
                      className="rounded-md border flex-shrink-0"
                      fallbackIcon={<Package className="h-8 w-8 text-muted-foreground" />}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />}
                        <span className="truncate">{product.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {product.brand && <span className="bg-muted px-2 py-1 rounded">{product.brand}</span>}
                        <span className="bg-muted px-2 py-1 rounded">
                          {product.levels.length} emplacement{product.levels.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {product.reference || '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {product.category && <Badge variant="outline" className="text-xs">{product.category}</Badge>}
                </TableCell>
                {visibleBases.map((base) => {
                  const level = quantityFor(product, base.id);
                  return (
                    <TableCell key={base.id} className="text-center">
                      {level ? (
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-semibold ${
                              level.quantity <= level.minThreshold ? 'text-orange-600' : ''
                            }`}
                          >
                            {level.quantity}
                          </span>
                          {level.location && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              📍 {level.location}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-bold">
                  {product.totalQuantity} {product.unit && <span className="text-xs font-normal text-muted-foreground">{product.unit}</span>}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    className={
                      product.totalQuantity === 0
                        ? 'bg-red-100 text-red-800'
                        : isLow
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }
                    variant={product.totalQuantity === 0 ? 'destructive' : isLow ? 'secondary' : 'default'}
                  >
                    {product.totalQuantity === 0 ? 'Rupture' : isLow ? 'Stock faible' : 'En stock'}
                  </Badge>
                </TableCell>
                {canRequestPurchase && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-marine-600"
                      title="Demande d'achats"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestPurchase?.(product);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
