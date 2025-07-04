import React from 'react';
import { Edit, Trash2, Package, AlertTriangle, Copy } from 'lucide-react';
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
  canManage: boolean;
}

export function StockTable({ items, isLoading, onEdit, onDuplicate, canManage }: StockTableProps) {
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
            <TableHead>Article</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Base</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead>Seuil minimum</TableHead>
            <TableHead>Unité</TableHead>
            <TableHead>Emplacement</TableHead>
            <TableHead>Statut</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = getStockStatus(item);
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {item.quantity <= item.minThreshold && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                    {item.name}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">
                  {item.reference || '-'}
                </TableCell>
                <TableCell>
                  {item.category && (
                    <Badge variant="outline">{item.category}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {item.baseName && (
                    <Badge variant="secondary">{item.baseName}</Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <span className={item.quantity <= item.minThreshold ? 'text-orange-600' : ''}>
                    {item.quantity}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600">
                  {item.minThreshold}
                </TableCell>
                <TableCell className="text-gray-600">
                  {item.unit || '-'}
                </TableCell>
                <TableCell className="text-gray-600">
                  {item.location || '-'}
                </TableCell>
                <TableCell>
                  <Badge className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
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