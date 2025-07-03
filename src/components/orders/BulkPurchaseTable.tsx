import React from 'react';
import { Edit, Eye, Package, Split } from 'lucide-react';
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
import { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface BulkPurchaseTableProps {
  orders: Order[];
  isLoading: boolean;
  onEdit: (order: Order) => void;
  onDistribute: (order: Order) => void;
  canManage: boolean;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800', 
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée', 
  cancelled: 'Annulée'
};

const distributionStatusColors = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800'
};

const distributionStatusLabels = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée'
};

const bulkPurchaseTypeLabels = {
  annual: 'Annuel',
  quarterly: 'Trimestriel',
  monthly: 'Mensuel'
};

export function BulkPurchaseTable({ orders, isLoading, onEdit, onDistribute, canManage }: BulkPurchaseTableProps) {
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const bulkOrders = orders.filter(order => order.isBulkPurchase);

  if (bulkOrders.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun achat groupé</h3>
        <p className="text-gray-500">Commencez par créer votre premier achat groupé.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Distribution</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead>Livraison prévue</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bulkOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span>{order.orderNumber}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {bulkPurchaseTypeLabels[order.bulkPurchaseType as keyof typeof bulkPurchaseTypeLabels] || order.bulkPurchaseType}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(order.orderDate).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                  {statusLabels[order.status as keyof typeof statusLabels]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={distributionStatusColors[order.distributionStatus as keyof typeof distributionStatusColors]}>
                  {distributionStatusLabels[order.distributionStatus as keyof typeof distributionStatusLabels]}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(order.totalAmount)}
              </TableCell>
              <TableCell>
                {order.items.length} article{order.items.length > 1 ? 's' : ''}
              </TableCell>
              <TableCell>
                {order.expectedDeliveryDate 
                  ? new Date(order.expectedDeliveryDate).toLocaleDateString('fr-FR')
                  : '-'
                }
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(order)}
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {order.status === 'delivered' && order.distributionStatus !== 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDistribute(order)}
                        title="Gérer la distribution"
                      >
                        <Split className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(order)}
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}