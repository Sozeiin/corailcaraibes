import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  Package, 
  Truck, 
  Clock,
  TrendingUp,
  MapPin
} from 'lucide-react';

export function LogisticsAnalytics() {
  const { data: stats } = useQuery({
    queryKey: ['logistics-analytics'],
    queryFn: async () => {
      // Statistiques générales
      const [shipmentsQuery, receiptsQuery, pendingQuery] = await Promise.all([
        supabase
          .from('logistics_shipments')
          .select('*')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('logistics_receipts')
          .select('*')
          .eq('status', 'validated')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('logistics_shipments')
          .select('*')
          .eq('status', 'shipped')
      ]);

      const shipments = shipmentsQuery.data || [];
      const receipts = receiptsQuery.data || [];
      const pending = pendingQuery.data || [];

      return {
        totalShipments: shipments.length,
        totalReceipts: receipts.length,
        pendingShipments: pending.length,
        averageDeliveryTime: 0 // Calculé plus tard
      };
    }
  });

  const { data: baseStats } = useQuery({
    queryKey: ['logistics-base-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_shipments')
        .select(`
          base_destination_id,
          base_destination:bases!logistics_shipments_base_destination_id_fkey(name),
          status
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Grouper par base de destination
      const baseGroups = data?.reduce((acc: any, item) => {
        const baseName = item.base_destination?.name || 'Inconnue';
        if (!acc[baseName]) {
          acc[baseName] = { total: 0, delivered: 0 };
        }
        acc[baseName].total++;
        if (item.status === 'delivered') {
          acc[baseName].delivered++;
        }
        return acc;
      }, {});

      return Object.entries(baseGroups || {}).map(([name, stats]: [string, any]) => ({
        name,
        total: stats.total,
        delivered: stats.delivered,
        deliveryRate: Math.round((stats.delivered / stats.total) * 100)
      }));
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics Logistique</h2>
        <p className="text-muted-foreground">
          Tableau de bord des performances logistiques
        </p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expéditions (30j)
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalShipments || 0}</div>
            <p className="text-xs text-muted-foreground">
              +12% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Réceptions validées
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReceipts || 0}</div>
            <p className="text-xs text-muted-foreground">
              +8% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En transit
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingShipments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Expéditions en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Délai moyen
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2j</div>
            <p className="text-xs text-muted-foreground">
              -0.5j par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance par base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Performance par Base de Destination
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {baseStats?.map((base) => (
              <div key={base.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="font-medium">{base.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {base.delivered}/{base.total} expéditions
                  </div>
                  <div className="text-sm font-medium">
                    {base.deliveryRate}% livrées
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${base.deliveryRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tendances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des Expéditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <BarChart3 className="h-8 w-8 mr-2" />
              Graphique des tendances (à implémenter)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Temps de Livraison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <TrendingUp className="h-8 w-8 mr-2" />
              Graphique des délais (à implémenter)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}