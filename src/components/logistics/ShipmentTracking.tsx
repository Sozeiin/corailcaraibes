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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Suivi des Expéditions</h2>
        <p className="text-muted-foreground">
          Traçabilité des expéditions en cours et livrées
        </p>
      </div>

      <div className="grid gap-4">
        {shipments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune expédition en transit</p>
            </CardContent>
          </Card>
        ) : (
          shipments.map((shipment) => (
            <Card key={shipment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(shipment.status)}
                      {shipment.shipment_number}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {shipment.base_origin?.name} → {shipment.base_destination?.name}
                    </div>
                  </div>
                  <Badge 
                    variant={shipment.status === 'delivered' ? 'default' : 'secondary'}
                    className={getStatusColor(shipment.status)}
                  >
                    {shipment.status === 'shipped' ? 'En transit' : 'Livré'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Expédié le</p>
                      <p className="text-sm text-muted-foreground">
                        {shipment.shipped_date 
                          ? new Date(shipment.shipped_date).toLocaleDateString('fr-FR')
                          : 'Non défini'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Transporteur</p>
                      <p className="text-sm text-muted-foreground">
                        {shipment.carrier || 'Non spécifié'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Numéro de suivi</p>
                      <p className="text-sm text-muted-foreground">
                        {shipment.tracking_number || 'Non disponible'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {shipment.logistics_receipts && shipment.logistics_receipts.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
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