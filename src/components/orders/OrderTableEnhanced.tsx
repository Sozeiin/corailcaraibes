import React from 'react';
import { Edit, Trash2, Eye, Package, MoreHorizontal } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { WorkflowActions } from '@/components/orders/WorkflowActions';
import { WorkflowStatusIndicator } from '@/components/orders/WorkflowStatusIndicator';
import { SyncButton } from '@/components/orders/SyncButton';
import { WorkflowStatus } from '@/types/workflow';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OrderTableEnhancedProps {
  orders: Order[];
  isLoading: boolean;
  onEdit: (order: Order) => void;
  onViewDetails: (order: Order) => void;
  onDelete: (order: Order) => void;
  canManage: boolean;
  onOrderUpdate?: () => void;
  showCompactView?: boolean;
}

export function OrderTableEnhanced({ 
  orders, 
  isLoading, 
  onEdit, 
  onViewDetails, 
  onDelete, 
  canManage, 
  onOrderUpdate,
  showCompactView = false
}: OrderTableEnhancedProps) {
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
            <TableHead>Statut & Progression</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Articles</TableHead>
            {!showCompactView && <TableHead>Livraison</TableHead>}
            {!showCompactView && <TableHead>Dernière activité</TableHead>}
            {user?.role === 'direction' && <TableHead>Actions Direction</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{order.orderNumber}</span>
                  {order.isPurchaseRequest && (
                    <Badge variant="outline" className="text-xs w-fit mt-1">
                      Demande d'achat
                    </Badge>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex flex-col">
                  <span>{new Date(order.orderDate).toLocaleDateString('fr-FR')}</span>
                  {!showCompactView && (
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(order.createdAt), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </span>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <WorkflowStatusIndicator 
                  status={order.status as WorkflowStatus} 
                  showIcon={true}
                  showProgress={!showCompactView}
                  size={showCompactView ? 'sm' : 'md'}
                />
              </TableCell>
              
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{formatCurrency(order.totalAmount)}</span>
                  {order.urgencyLevel && order.urgencyLevel !== 'normal' && (
                    <Badge 
                      variant={order.urgencyLevel === 'urgent' ? 'destructive' : 'secondary'}
                      className="text-xs w-fit mt-1"
                    >
                      {order.urgencyLevel}
                    </Badge>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{order.items.length}</span>
                  <span className="text-gray-500">article{order.items.length > 1 ? 's' : ''}</span>
                </div>
              </TableCell>
              
              {!showCompactView && (
                <TableCell>
                  {order.deliveryDate 
                    ? new Date(order.deliveryDate).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </TableCell>
              )}
              
              {!showCompactView && (
                <TableCell className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(order.createdAt), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </TableCell>
              )}
              
              {user?.role === 'direction' && (
                <TableCell>
                  <WorkflowActions 
                    order={order} 
                    onOrderUpdate={onOrderUpdate}
                  />
                </TableCell>
              )}
              
              <TableCell className="text-right">
                <div className="flex justify-end">
                  {canManage ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDetails(order)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(order)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        {order.status === 'confirmed' && (
                          <div className="px-2 py-1">
                            <SyncButton 
                              orderId={order.id}
                              orderNumber={order.orderNumber}
                              onSyncComplete={onOrderUpdate}
                            />
                          </div>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDelete(order)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}