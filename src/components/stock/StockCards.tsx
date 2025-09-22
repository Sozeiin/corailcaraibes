import React, { memo, useMemo } from 'react';
import { Edit, Trash2, Package, AlertTriangle, Copy, Plus, Minus, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockItem } from '@/types';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';

interface StockCardsProps {
  items: StockItem[];
  isLoading: boolean;
  onEdit: (item: StockItem) => void;
  onDuplicate?: (item: StockItem) => void;
  onUpdateQuantity?: (itemId: string, newQuantity: number) => void;
  onViewDetails?: (item: StockItem) => void;
  canManage: boolean;
  userBaseId?: string;
}

// Composant optimisé pour une carte individuelle
const StockCard = memo(({ 
  item, 
  onEdit, 
  onDuplicate, 
  onUpdateQuantity, 
  onViewDetails, 
  canManage,
  userBaseId 
}: {
  item: StockItem;
  onEdit: (item: StockItem) => void;
  onDuplicate?: (item: StockItem) => void;
  onUpdateQuantity?: (itemId: string, newQuantity: number) => void;
  onViewDetails?: (item: StockItem) => void;
  canManage: boolean;
  userBaseId?: string;
}) => {
  const isLowStock = item.quantity <= item.minThreshold;
  
  return (
    <Card className={`transition-shadow hover:shadow-md ${isLowStock ? 'border-orange-200' : ''}`}>
      {item.photoUrl && (
        <div className="mb-4">
          <img
            src={item.photoUrl}
            alt={item.name}
            className="w-full h-32 object-cover rounded-t-lg"
            loading="lazy"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Package className="h-5 w-5 text-marine-600 flex-shrink-0" />
            <span className="truncate">{item.name}</span>
          </div>
          {isLowStock && (
            <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
          )}
        </CardTitle>
        {item.reference && (
          <p className="text-sm text-gray-500">Réf: {item.reference}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={item.category ? 'secondary' : 'outline'}>
              {item.category || 'Non catégorisé'}
            </Badge>
            {item.baseName && (
              <Badge variant="outline" className="text-xs">
                {item.baseName}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Stock actuel</p>
            <p className={`font-semibold ${isLowStock ? 'text-orange-600' : 'text-gray-900'}`}>
              {item.quantity} {item.unit}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Seuil minimum</p>
            <p className="font-semibold text-gray-900">{item.minThreshold} {item.unit}</p>
          </div>
        </div>

        {item.location && (
          <div className="text-sm">
            <p className="text-gray-500">Emplacement</p>
            <p className="text-gray-900">{item.location}</p>
          </div>
        )}

        {canManage && (
          <div className="flex items-center gap-2 pt-2">
            {/* Actions d'édition seulement pour les articles de la même base */}
            {(!userBaseId || item.baseId === userBaseId) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(item)}
                className="flex-1"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDuplicate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(item)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(item)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {canManage && onUpdateQuantity && (!userBaseId || item.baseId === userBaseId) && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
              disabled={item.quantity <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="flex-1 text-center text-sm">Ajuster stock</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

StockCard.displayName = 'StockCard';

export function StockCards({ items, isLoading, onEdit, onDuplicate, onUpdateQuantity, onViewDetails, canManage, userBaseId }: StockCardsProps) {
  // Optimisation : mémoriser les éléments pour éviter les re-rendus inutiles
  const memoizedItems = useMemo(() => items, [items]);

  if (isLoading) {
    return <OptimizedSkeleton type="grid" count={6} />;
  }

  if (memoizedItems.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun article en stock</h3>
        <p className="text-gray-500">Commencez par ajouter vos premiers articles.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {memoizedItems.map((item) => (
        <StockCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onUpdateQuantity={onUpdateQuantity}
          onViewDetails={onViewDetails}
          canManage={canManage}
          userBaseId={userBaseId}
        />
      ))}
    </div>
  );
}