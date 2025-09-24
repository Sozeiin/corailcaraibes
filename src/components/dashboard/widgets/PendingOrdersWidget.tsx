import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMemo } from 'react';
import { Package, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export const PendingOrdersWidget = ({ config }: WidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardData = useDashboardData();

  const pendingOrders = useMemo(() => {
    if (dashboardData.loading) return [];

    const { orders, boats } = dashboardData;
    
    // Simulate different types of pending orders
    const allOrders = [
      ...orders
        .filter(order => ['pending', 'processing'].includes(order.status))
        .map(order => ({
          id: order.id,
          type: 'stock',
          title: `Commande ${order.order_number || order.id.slice(-8)}`,
          status: order.status,
          priority: order.urgency_level || 'normal',
          createdAt: order.created_at,
          description: `${order.total_amount || 0}€ • ${order.supplier_name || 'Fournisseur'}`
        })),
      // Add simulated preparation orders based on boat status
      ...boats
        .filter(boat => boat.status === 'maintenance')
        .slice(0, 3)
        .map((boat, index) => ({
          id: `prep-${boat.id}`,
          type: 'preparation',
          title: `Préparation ${boat.name}`,
          status: 'pending',
          priority: index === 0 ? 'urgent' : 'normal',
          createdAt: boat.updated_at,
          description: 'Check-in après location'
        })),
      // Add simulated check-in/out orders
      ...boats
        .filter(boat => boat.status === 'rented')
        .slice(0, 2)
        .map(boat => ({
          id: `checkin-${boat.id}`,
          type: 'checkin',
          title: `Check-in ${boat.name}`,
          status: 'pending',
          priority: 'normal',
          createdAt: new Date().toISOString(),
          description: 'Retour de location prévu'
        }))
    ];
    
    return allOrders
      .sort((a, b) => {
        // Sort by priority then by creation date
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5);
  }, [dashboardData]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'preparation':
        return CheckCircle2;
      case 'checkin':
        return Clock;
      default:
        return Package;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preparation':
        return 'default';
      case 'checkin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityBadge = (priority: string) => {
    return priority === 'urgent' ? 'destructive' : 'outline';
  };

  const orderStats = useMemo(() => {
    const stats = {
      total: pendingOrders.length,
      urgent: pendingOrders.filter(o => o.priority === 'urgent').length,
      preparations: pendingOrders.filter(o => o.type === 'preparation').length,
      checkins: pendingOrders.filter(o => o.type === 'checkin').length,
      stock: pendingOrders.filter(o => o.type === 'stock').length
    };
    return stats;
  }, [pendingOrders]);

  if (dashboardData.loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          {config.title}
          <Badge variant="outline" className="ml-auto">
            {orderStats.total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium">{orderStats.preparations}</div>
            <div className="text-muted-foreground">Prépa</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{orderStats.checkins}</div>
            <div className="text-muted-foreground">Check-in</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{orderStats.stock}</div>
            <div className="text-muted-foreground">Stock</div>
          </div>
        </div>

        <div className="space-y-2">
          {pendingOrders.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Aucun ordre en attente
            </div>
          ) : (
            pendingOrders.map((order) => {
              const TypeIcon = getTypeIcon(order.type);
              
              return (
                <div key={order.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{order.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.description} • {formatDistanceToNow(parseISO(order.createdAt), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.priority === 'urgent' && (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    )}
                    <Badge variant={getTypeColor(order.type)}>
                      {order.type === 'preparation' ? 'Prépa' : 
                       order.type === 'checkin' ? 'Check' : 'Stock'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        if (order.type === 'preparation') {
                          navigate('/boat-preparation');
                        } else if (order.type === 'checkin') {
                          navigate('/boats');
                        } else {
                          navigate('/orders');
                        }
                      }}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {orderStats.urgent > 0 && (
          <div className="border-t pt-3">
            <Button 
              size="sm" 
              className="w-full" 
              variant="secondary"
              onClick={() => {
                const urgentOrder = pendingOrders.find(o => o.priority === 'urgent');
                if (urgentOrder?.type === 'preparation') {
                  navigate('/boat-preparation');
                } else if (urgentOrder?.type === 'checkin') {
                  navigate('/boats');
                } else {
                  navigate('/orders');
                }
              }}
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Traiter {orderStats.urgent} ordre(s) urgent(s)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};