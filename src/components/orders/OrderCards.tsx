import React from 'react';
import { Edit, Eye, Package, Calendar, Euro, Truck, Building2, Clock, CheckCircle, XCircle, Ship, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types';

interface OrderCardsProps {
  orders: Order[];
  isLoading: boolean;
  onEdit: (order: Order) => void;
  onViewDetails: (order: Order) => void;
  canManage: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800', 
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  supplier_requested: 'bg-purple-100 text-purple-800',
  shipping_mainland: 'bg-cyan-100 text-cyan-800',
  shipping_antilles: 'bg-indigo-100 text-indigo-800'
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée', 
  cancelled: 'Annulée',
  pending_approval: 'En attente d\'approbation',
  supplier_requested: 'Demande effectuée',
  shipping_mainland: 'Livraison Métropole',
  shipping_antilles: 'Envoi Antilles'
};

const urgencyColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const urgencyLabels = {
  low: 'Faible',
  normal: 'Normale',
  high: 'Élevée',
  urgent: 'Urgente'
};

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  delivered: CheckCircle,
  cancelled: XCircle,
  pending_approval: Clock,
  supplier_requested: CheckCircle,
  shipping_mainland: Truck,
  shipping_antilles: Ship
};

export function OrderCards({ orders, isLoading, onEdit, onViewDetails, canManage }: OrderCardsProps) {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => (
        <Card 
          key={order.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onViewDetails(order)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate">
                  {order.orderNumber}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(order.orderDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                {statusLabels[order.status] || order.status}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Informations principales */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Montant</p>
                  <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Articles</p>
                  <p className="font-semibold">
                    {(order.items || []).length} article{(order.items || []).length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Purchase request specific info */}
            {order.isPurchaseRequest && (
              <div className="space-y-2">
                {order.urgencyLevel && (
                  <Badge className={urgencyColors[order.urgencyLevel as keyof typeof urgencyColors]}>
                    Urgence: {urgencyLabels[order.urgencyLevel as keyof typeof urgencyLabels]}
                  </Badge>
                )}
                {order.trackingUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(order.trackingUrl, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Suivi transporteur
                  </Button>
                )}
              </div>
            )}

            {/* Date de livraison */}
            {order.deliveryDate && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Livrée le</p>
                  <p className="font-semibold">
                    {new Date(order.deliveryDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            )}

            {/* Aperçu des articles */}
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground mb-2">Articles :</p>
              <div className="space-y-1">
                {(order.items || []).slice(0, 2).map((item, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span className="truncate">{item.productName}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                ))}
                {(order.items || []).length > 2 && (
                  <p className="text-xs text-muted-foreground">
                    ... et {(order.items || []).length - 2} autre(s) article(s)
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(order);
                }}
                title="Voir les détails"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(order);
                  }}
                  title="Modifier"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}