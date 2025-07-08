import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  Package, 
  MapPin,
  Clock,
  CheckCircle
} from 'lucide-react';

export function ShipmentTracking() {
  const { data: shipments = [] } = useQuery({
    queryKey: ['shipment-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_shipments')
        .select(`
          *,
          base_origin:bases!logistics_shipments_base_origin_id_fkey(name),
          base_destination:bases!logistics_shipments_base_destination_id_fkey(name),
          logistics_receipts(*)
        `)
        .in('status', ['shipped', 'delivered'])
        .order('shipped_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shipped':
        return 'text-blue-600';
      case 'delivered':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Suivi des Expéditions</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Traçabilité des expéditions en cours et livrées
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {shipments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6 sm:py-8">
              <Truck className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-sm sm:text-base">Aucune expédition en transit</p>
            </CardContent>
          </Card>
        ) : (
          shipments.map((shipment) => (
            <Card key={shipment.id}>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      {getStatusIcon(shipment.status)}
                      <span className="truncate">{shipment.shipment_number}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{shipment.base_origin?.name} → {shipment.base_destination?.name}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={shipment.status === 'delivered' ? 'default' : 'secondary'}
                    className={`${getStatusColor(shipment.status)} text-xs flex-shrink-0`}
                  >
                    {shipment.status === 'shipped' ? 'En transit' : 'Livré'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium">Expédié le</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {shipment.shipped_date 
                          ? new Date(shipment.shipped_date).toLocaleDateString('fr-FR')
                          : 'Non défini'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium">Transporteur</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {shipment.carrier || 'Non spécifié'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium">N° de suivi</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {shipment.tracking_number || 'Non disponible'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {shipment.logistics_receipts && shipment.logistics_receipts.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs sm:text-sm font-medium text-green-800">
                      ✅ Réception confirmée
                    </p>
                    <p className="text-xs text-green-600">
                      Reçu le {new Date(shipment.logistics_receipts[0].received_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}