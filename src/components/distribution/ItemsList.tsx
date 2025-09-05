import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Package } from 'lucide-react';

interface ShipmentItem {
  id: string;
  sku: string;
  product_label: string;
  qty: number;
  received_qty?: number;
  package_id?: string;
}

interface ItemsListProps {
  items: ShipmentItem[];
  onQuantityChange?: (itemId: string, newQty: number) => void;
  showPackageCode?: boolean;
  showReceivedQty?: boolean;
  readOnly?: boolean;
}

export function ItemsList({ 
  items, 
  onQuantityChange, 
  showPackageCode = false, 
  showReceivedQty = false,
  readOnly = false 
}: ItemsListProps) {
  const handleQuantityChange = (itemId: string, delta: number) => {
    if (!onQuantityChange || readOnly) return;
    
    const item = items.find(i => i.id === itemId);
    if (item) {
      const newQty = Math.max(1, item.qty + delta);
      onQuantityChange(itemId, newQty);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Aucun article scanné</p>
        <p className="text-sm mt-1">Commencez par scanner des articles pour les ajouter à l'expédition</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Articles scannés ({items.length})
      </h3>
      
      {/* Mobile view */}
      <div className="block sm:hidden space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-sm">{item.product_label || item.sku}</p>
                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
              </div>
              {showPackageCode && item.package_id && (
                <Badge variant="outline" className="text-xs">
                  Colis
                </Badge>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="text-muted-foreground">Quantité: </span>
                <span className="font-medium">{item.qty}</span>
                {showReceivedQty && (
                  <>
                    <span className="text-muted-foreground"> / Reçu: </span>
                    <span className="font-medium">{item.received_qty || 0}</span>
                  </>
                )}
              </div>
              
              {onQuantityChange && !readOnly && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.id, -1)}
                    disabled={item.qty <= 1}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{item.qty}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.id, 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Article</TableHead>
              <TableHead className="text-center">Quantité</TableHead>
              {showReceivedQty && <TableHead className="text-center">Reçu</TableHead>}
              {showPackageCode && <TableHead>Colis</TableHead>}
              {onQuantityChange && !readOnly && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell>{item.product_label || 'Article sans nom'}</TableCell>
                <TableCell className="text-center">{item.qty}</TableCell>
                {showReceivedQty && (
                  <TableCell className="text-center">
                    <Badge 
                      variant={item.received_qty === item.qty ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {item.received_qty || 0}
                    </Badge>
                  </TableCell>
                )}
                {showPackageCode && (
                  <TableCell>
                    {item.package_id && (
                      <Badge variant="outline">Emballé</Badge>
                    )}
                  </TableCell>
                )}
                {onQuantityChange && !readOnly && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={item.qty <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.qty}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}