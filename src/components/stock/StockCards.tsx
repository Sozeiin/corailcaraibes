import React from 'react';
import { Edit, Trash2, Package, AlertTriangle, Copy, Plus, Minus, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockItem } from '@/types';

interface StockCardsProps {
  items: StockItem[];
  isLoading: boolean;
  onEdit: (item: StockItem) => void;
  onDuplicate?: (item: StockItem) => void;
  onUpdateQuantity?: (itemId: string, newQuantity: number) => void;
  onViewDetails?: (item: StockItem) => void;
  canManage: boolean;
}

export function StockCards({ items, isLoading, onEdit, onDuplicate, onUpdateQuantity, onViewDetails, canManage }: StockCardsProps) {
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun article en stock</h3>
        <p className="text-gray-500">Commencez par ajouter vos premiers articles.</p>
      </div>
    );
  }

  const getStockStatus = (item: StockItem) => {
    if (item.quantity === 0) {
      return { label: 'Rupture', variant: 'destructive' as const };
    } else if (item.quantity <= item.minThreshold) {
      return { label: 'Stock faible', variant: 'secondary' as const };
    } else {
      return { label: 'En stock', variant: 'default' as const };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const status = getStockStatus(item);
        return (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.quantity <= item.minThreshold && (
                    <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  )}
                  <CardTitle className="text-base font-semibold truncate">
                    {item.name}
                  </CardTitle>
                </div>
                <Badge variant={status.variant} className="text-xs">
                  {status.label}
                </Badge>
              </div>
              {item.reference && (
                <p className="text-sm text-muted-foreground">
                  Réf: {item.reference}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Quantité</p>
                  <div className="flex items-center gap-1">
                    {canManage && onUpdateQuantity && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        disabled={item.quantity === 0}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}
                    <span className={`font-semibold ${item.quantity <= item.minThreshold ? 'text-orange-600' : ''}`}>
                      {item.quantity}
                    </span>
                    {canManage && onUpdateQuantity && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Seuil min.</p>
                  <p className="font-semibold">{item.minThreshold}</p>
                </div>
                
                {item.category && (
                  <div>
                    <p className="text-muted-foreground">Catégorie</p>
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                )}
                
                {item.unit && (
                  <div>
                    <p className="text-muted-foreground">Unité</p>
                    <p className="font-semibold">{item.unit}</p>
                  </div>
                )}
              </div>

              {/* Informations supplémentaires */}
              <div className="space-y-2 text-sm">
                {item.baseName && (
                  <div>
                    <p className="text-muted-foreground">Base</p>
                    <Badge variant="secondary" className="text-xs">
                      {item.baseName}
                    </Badge>
                  </div>
                )}
                
                {item.location && (
                  <div>
                    <p className="text-muted-foreground">Emplacement</p>
                    <p className="font-semibold">{item.location}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(item)}
                    title="Voir les détails"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {canManage && (
                  <>
                    {onDuplicate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDuplicate(item)}
                        title="Dupliquer sur une autre base"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}