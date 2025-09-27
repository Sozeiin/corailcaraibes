import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Ship, User, Play, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCheckinCheckoutOrders } from '@/hooks/useCheckinCheckoutOrders';
import { useAuth } from '@/contexts/AuthContext';
import { CheckInOutDialog } from './CheckInOutDialog';

export function TechnicianCheckinCheckoutOrders() {
  const { user } = useAuth();
  const { orders, startOrder, completeOrder } = useCheckinCheckoutOrders();
  const [checkInOutDialogOpen, setCheckInOutDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Filter orders for current technician
  const myOrders = orders.filter(order => 
    order.technician_id === user?.id &&
    order.status !== 'completed' &&
    order.status !== 'cancelled'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'checkin' 
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const handleStartOrder = (order: any) => {
    startOrder(order.id);
    setSelectedOrder(order);
    setCheckInOutDialogOpen(true);
  };

  const handleCheckInOutComplete = (data: any) => {
    if (selectedOrder && data.checklistId) {
      completeOrder({ 
        orderId: selectedOrder.id, 
        checklistId: data.checklistId 
      });
    }
    setCheckInOutDialogOpen(false);
    setSelectedOrder(null);
  };

  if (myOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Ship className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun ordre assigné</h3>
          <p className="text-muted-foreground">
            Aucun check-in/out n'est actuellement assigné pour aujourd'hui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Ordres Check-in / Check-out assignés</h3>
      
      <div className="grid gap-4">
        {myOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Ship className="h-5 w-5 text-marine-500" />
                  <div>
                    <CardTitle className="text-lg">
                      {order.boat?.name} - {order.boat?.model}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getTypeColor(order.order_type)}>
                        {order.order_type === 'checkin' ? 'Check-in' : 'Check-out'}
                      </Badge>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status === 'assigned' && 'Assigné'}
                        {order.status === 'in_progress' && 'En cours'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {order.status === 'assigned' && (
                    <Button
                      onClick={() => handleStartOrder(order)}
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Commencer
                    </Button>
                  )}
                  {order.status === 'in_progress' && (
                    <Button
                      onClick={() => {
                        setSelectedOrder(order);
                        setCheckInOutDialogOpen(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Continuer
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(order.scheduled_start), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(order.scheduled_start), 'HH:mm')} - {format(new Date(order.scheduled_end), 'HH:mm')}
                  </span>
                </div>
              </div>
              {order.notes && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedOrder && (
        <CheckInOutDialog 
          open={checkInOutDialogOpen}
          onOpenChange={setCheckInOutDialogOpen}
          preselectedBoat={selectedOrder.boat}
          preselectedType={selectedOrder.order_type}
          preselectedRentalData={selectedOrder.rental_data}
          onComplete={handleCheckInOutComplete}
        />
      )}
    </div>
  );
}