import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStatusColor, getStatusLabel } from '@/lib/workflowUtils';
import { WorkflowStatusIndicator } from './WorkflowStatusIndicator';
import { WorkflowStatus } from '@/types/workflow';
import { formatCurrency } from '@/lib/utils';
import { 
  Package2, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  MapPin,
  User,
  TrendingUp,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OrderCardProps {
  order: any;
  onEdit: (order: any) => void;
  onViewDetails: (order: any) => void;
  onDelete: (order: any) => void;
  canManage: boolean;
  showActions?: boolean;
}

export function OrderCard({ 
  order, 
  onEdit, 
  onViewDetails, 
  onDelete, 
  canManage,
  showActions = true
}: OrderCardProps) {
  
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-lg font-semibold">
                {order.orderNumber}
              </CardTitle>
              {order.isPurchaseRequest && (
                <Badge variant="outline" className="text-xs">
                  Demande d'achat
                </Badge>
              )}
              {order.urgencyLevel && order.urgencyLevel !== 'normal' && (
                <Badge 
                  variant={order.urgencyLevel === 'urgent' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {order.urgencyLevel}
                </Badge>
              )}
            </div>
            
            <WorkflowStatusIndicator 
              status={order.status as WorkflowStatus}
              showIcon={true}
              showProgress={true}
              size="md"
            />
          </div>
          
          {showActions && canManage && (
            <div className="flex gap-2">
              <button
                onClick={() => onViewDetails(order)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Voir les détails"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(order)}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Modifier"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(order)}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(order.orderDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
          
          {order.supplier?.name && (
            <div className="flex items-center gap-2 text-gray-600">
              <Package2 className="w-4 h-4" />
              <span>{order.supplier.name}</span>
            </div>
          )}
          
          {order.base?.name && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{order.base.name}</span>
            </div>
          )}
          
          {order.requested_by_profile?.name && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>{order.requested_by_profile.name}</span>
            </div>
          )}
        </div>

        {/* Résumé financier et articles */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">Articles</p>
              <p className="font-semibold">{order.items?.length || 0}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Montant total</p>
              <p className="font-semibold text-lg">
                {formatCurrency(order.totalAmount || 0)}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-gray-500">
              Créée {formatDistanceToNow(new Date(order.createdAt), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
            {order.deliveryDate && (
              <p className="text-xs text-gray-500">
                Livraison: {new Date(order.deliveryDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
        
        {/* Actions principales */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t">
            <button
              onClick={() => onViewDetails(order)}
              className="flex-1 py-2 px-4 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
            >
              Voir les détails
            </button>
            {canManage && (
              <button
                onClick={() => onEdit(order)}
                className="py-2 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                Modifier
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface OrderCardsGridProps {
  orders: any[];
  isLoading: boolean;
  onEdit: (order: any) => void;
  onViewDetails: (order: any) => void;
  onDelete: (order: any) => void;
  canManage: boolean;
}

export function OrderCardsGrid({
  orders,
  isLoading,
  onEdit,
  onViewDetails,
  onDelete,
  canManage
}: OrderCardsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande</h3>
          <p className="text-gray-500">
            Aucune commande ne correspond à vos critères de recherche.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onEdit={onEdit}
          onViewDetails={onViewDetails}
          onDelete={onDelete}
          canManage={canManage}
        />
      ))}
    </div>
  );
}