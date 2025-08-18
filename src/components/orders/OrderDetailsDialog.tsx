import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';
import { WorkflowTimeline } from './WorkflowTimeline';
import { WorkflowActions } from './WorkflowActions';
import { WorkflowStatusIndicator, WorkflowStepsOverview } from './WorkflowStatusIndicator';
import { WorkflowTimelineEnhanced } from './WorkflowTimelineEnhanced';
import { WorkflowStatus } from '@/types/workflow';
import { ExternalLink, Package, Calendar, User, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export function OrderDetailsDialog({ isOpen, onClose, order }: OrderDetailsDialogProps) {
  // Charger les détails complets de la commande et ses items
  const { data: orderDetails, isLoading, refetch } = useQuery({
    queryKey: ['order-details', order?.id],
    queryFn: async () => {
      if (!order?.id) return null;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          supplier:suppliers(name),
          base:bases(name, location),
          boat:boats(name, model),
          requested_by_profile:profiles!orders_requested_by_fkey(name)
        `)
        .eq('id', order.id)
        .single();

      if (orderError) throw orderError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('product_name');

      if (itemsError) throw itemsError;

      return {
        ...orderData,
        items: itemsData || []
      };
    },
    enabled: !!order?.id && isOpen
  });

  if (!order) return null;

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

  // Remove this as we'll use WorkflowStatusIndicator instead

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {order.isPurchaseRequest ? 'Demande d\'achat' : 'Commande'} {order.orderNumber}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2">
                <WorkflowStatusIndicator 
                  status={order.status as WorkflowStatus}
                  showIcon={true}
                  showProgress={true}
                  size="md"
                />
                {order.urgencyLevel && (
                  <Badge className={urgencyColors[order.urgencyLevel]}>
                    Urgence: {urgencyLabels[order.urgencyLevel]}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Actions du workflow */}
            <WorkflowActions 
              order={order} 
              onOrderUpdate={() => {
                refetch();
                // Pas besoin de fermer le dialog, on veut voir la mise à jour
              }} 
            />
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date de commande</p>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(orderDetails?.order_date || order.orderDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    {orderDetails?.delivery_date && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Livraison prévue</p>
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(orderDetails.delivery_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {orderDetails?.supplier && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fournisseur</p>
                        <p>{orderDetails.supplier.name}</p>
                      </div>
                    )}

                    {orderDetails?.base && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Base</p>
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {orderDetails.base.name} - {orderDetails.base.location}
                        </p>
                      </div>
                    )}

                    {orderDetails?.boat && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Bateau concerné</p>
                        <p>{orderDetails.boat.name} - {orderDetails.boat.model}</p>
                      </div>
                    )}

                    {orderDetails?.requested_by_profile && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Demandé par</p>
                        <p className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {orderDetails.requested_by_profile.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium text-gray-500">Montant total</p>
                    <p className="text-lg font-semibold">
                      {(orderDetails?.total_amount || order.totalAmount)?.toFixed(2)} €
                    </p>
                  </div>

                  {orderDetails?.request_notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Notes de la demande</p>
                        <p className="text-sm bg-gray-50 p-3 rounded">
                          {orderDetails.request_notes}
                        </p>
                      </div>
                    </>
                  )}

                  {orderDetails?.tracking_url && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Suivi transporteur</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(orderDetails.tracking_url, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Voir le suivi
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="text-xs text-gray-500">
                    Créée {formatDistanceToNow(new Date(order.createdAt), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Articles */}
          <Card>
            <CardHeader>
              <CardTitle>Articles commandés</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {orderDetails?.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product_name}</h4>
                        {item.reference && (
                          <p className="text-sm text-gray-600">Réf: {item.reference}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">Qté: {item.quantity}</p>
                        <p className="text-gray-600">{item.unit_price?.toFixed(2)} €/u</p>
                        <p className="font-semibold">{(item.total_price || item.quantity * item.unit_price)?.toFixed(2)} €</p>
                      </div>
                    </div>
                  ))}
                  
                  {(!orderDetails?.items || orderDetails.items.length === 0) && (
                    <p className="text-gray-500 text-center py-4">Aucun article</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vue d'ensemble du workflow */}
        <div className="mt-6">
          <WorkflowStepsOverview 
            currentStatus={order.status as WorkflowStatus}
            className="mb-6"
          />
        </div>

        {/* Timeline détaillée du workflow */}
        <div className="mt-6">
          <WorkflowTimelineEnhanced orderId={order.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}