import React from 'react';
import { Edit, Trash2, Eye, Package } from 'lucide-react';
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
import { WorkflowActions } from '@/components/orders/WorkflowActions';
import { useAuth } from '@/contexts/AuthContext';

interface OrderTableProps {
  orders: Order[];
  isLoading: boolean;
  onEdit: (order: Order) => void;
  onViewDetails: (order: Order) => void;
  onDelete: (order: Order) => void;
  canManage: boolean;
  onOrderUpdate?: () => void;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  supplier_search: 'bg-blue-100 text-blue-800',
  order_confirmed: 'bg-purple-100 text-purple-800',
  shipping_antilles: 'bg-orange-100 text-orange-800',
  received_scanned: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  // Legacy statuses
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800', 
  delivered: 'bg-green-100 text-green-800'
};

const statusLabels = {
  draft: 'Brouillon',
  pending_approval: 'En attente d\'approbation',
  approved: 'Approuvé',
  supplier_search: 'Recherche fournisseurs',
  order_confirmed: 'Commande confirmée',
  shipping_antilles: 'Envoi Antilles',
  received_scanned: 'Réception scannée',
  completed: 'Terminé',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
  // Legacy statuses
  pending: 'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée'
};

export function OrderTable({ orders, isLoading, onEdit, onViewDetails, onDelete, canManage, onOrderUpdate }: OrderTableProps) {
  const { user } = useAuth();
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande</h3>
        <p className="text-gray-500">Commencez par créer votre première commande.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Étape actuelle</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead>Livraison</TableHead>
            {user?.role === 'direction' && <TableHead>Actions Direction</TableHead>}
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.orderNumber}
              </TableCell>
              <TableCell>
                {new Date(order.orderDate).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[order.status as keyof typeof statusColors] || statusColors.pending_approval}>
                  {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(order.totalAmount)}
              </TableCell>
              <TableCell>
                {order.items.length} article{order.items.length > 1 ? 's' : ''}
              </TableCell>
              <TableCell>
                {order.deliveryDate 
                  ? new Date(order.deliveryDate).toLocaleDateString('fr-FR')
                  : '-'
                }
              </TableCell>
              {user?.role === 'direction' && (
                <TableCell>
                  <WorkflowActions 
                    order={order} 
                    onOrderUpdate={onOrderUpdate}
                  />
                </TableCell>
              )}
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                     <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(order)}
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(order)}
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(order)}
                      title="Supprimer"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
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