import React from 'react';
import { Edit, Trash2, Package, AlertTriangle, Copy, Plus, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockItem } from '@/types';

interface StockTableProps {
  items: StockItem[];
  isLoading: boolean;
  onEdit: (item: StockItem) => void;
  onDuplicate?: (item: StockItem) => void;
  onUpdateQuantity?: (itemId: string, newQuantity: number) => void;
  onViewDetails?: (item: StockItem) => void;
  onDelete: (item: StockItem) => void;
  canManage: boolean;
}

export function StockTable({ items, isLoading, onEdit, onDuplicate, onUpdateQuantity, onViewDetails, onDelete, canManage }: StockTableProps) {
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
      return { label: 'Rupture', className: 'bg-red-100 text-red-800' };
    } else if (item.quantity <= item.minThreshold) {
      return { label: 'Stock faible', className: 'bg-orange-100 text-orange-800' };
    } else {
      return { label: 'En stock', className: 'bg-green-100 text-green-800' };
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Article</TableHead>
            <TableHead className="hidden sm:table-cell">Référence</TableHead>
            <TableHead className="hidden md:table-cell">Catégorie</TableHead>
            <TableHead className="hidden lg:table-cell">Base</TableHead>
            <TableHead className="text-center">Quantité</TableHead>
            <TableHead className="hidden xl:table-cell text-center">Seuil min.</TableHead>
            <TableHead className="hidden lg:table-cell">Unité</TableHead>
            <TableHead className="hidden md:table-cell">Emplacement</TableHead>
            <TableHead className="text-center">Statut</TableHead>
            {canManage && <TableHead className="text-right min-w-[120px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = getStockStatus(item);
            return (
              <TableRow 
                key={item.id} 
                className={`hover:bg-muted/50 ${onViewDetails ? 'cursor-pointer' : ''}`}
                onClick={() => onViewDetails?.(item)}
              >
                <TableCell className="font-medium min-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {item.quantity <= item.minThreshold && (
                        <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      )}
                      <span className="font-medium truncate">{item.name}</span>
                    </div>
                    {/* Informations complémentaires visibles uniquement sur mobile/tablet */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:hidden">
                      {item.reference && (
                        <span className="bg-muted px-2 py-1 rounded">Réf: {item.reference}</span>
                      )}
                      {item.category && (
                        <span className="bg-muted px-2 py-1 rounded">{item.category}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground md:hidden">
                      {item.location && (
                        <span className="bg-muted px-2 py-1 rounded">📍 {item.location}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {item.reference || '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {item.category && (
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {item.baseName && (
                    <Badge variant="secondary" className="text-xs">{item.baseName}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      {canManage && onUpdateQuantity && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQuantity(item.id, Math.max(0, item.quantity - 1));
                          }}
                          disabled={item.quantity === 0}
                          title="Diminuer la quantité"
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                      <span className={`min-w-[2rem] text-center font-semibold ${item.quantity <= item.minThreshold ? 'text-orange-600' : ''}`}>
                        {item.quantity}
                      </span>
                      {canManage && onUpdateQuantity && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQuantity(item.id, item.quantity + 1);
                          }}
                          title="Augmenter la quantité"
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {/* Affichage des détails sur mobile/tablet */}
                    <div className="lg:hidden">
                      {item.unit && (
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                      )}
                    </div>
                    <div className="xl:hidden text-xs text-muted-foreground">
                      Seuil: {item.minThreshold}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-center text-muted-foreground">
                  {item.minThreshold}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                  {item.unit || '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {item.location || '-'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={status.className} variant={status.label === 'En stock' ? 'default' : status.label === 'Stock faible' ? 'secondary' : 'destructive'}>
                    <span className="hidden sm:inline">{status.label}</span>
                    <span className="sm:hidden">
                      {status.label === 'En stock' ? '✓' : status.label === 'Stock faible' ? '⚠' : '✗'}
                    </span>
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onDuplicate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(item);
                          }}
                          title="Dupliquer sur une autre base"
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        title="Modifier"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item);
                        }}
                        title="Supprimer"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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