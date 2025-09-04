import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Package, Euro, Ship, TrendingUp } from 'lucide-react';

interface OperationalReportsProps {
  dateRange: DateRange | undefined;
  isDirection: boolean;
  isChefBase: boolean;
}

export function OperationalReports({ dateRange, isDirection, isChefBase }: OperationalReportsProps) {
  const { user } = useAuth();

  const { data: operationalStats, isLoading } = useQuery({
    queryKey: ['operational-reports', dateRange, user?.baseId],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = dateRange?.to?.toISOString() || new Date().toISOString();

      // Stock data
      let stockQuery = supabase
        .from('stock_items')
        .select('*');

      if (!isDirection && user?.baseId) {
        stockQuery = stockQuery.eq('base_id', user.baseId);
      }

      const { data: stockItems } = await stockQuery;

      // Orders data
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          order_items(quantity, unit_price, total_price)
        `)
        .gte('created_at', from)
        .lte('created_at', to);

      if (!isDirection && user?.baseId) {
        ordersQuery = ordersQuery.eq('base_id', user.baseId);
      }

      const { data: orders } = await ordersQuery;

      // Boat availability data
      let boatsQuery = supabase
        .from('boats')
        .select('*');

      if (!isDirection && user?.baseId) {
        boatsQuery = boatsQuery.eq('base_id', user.baseId);
      }

      const { data: boats } = await boatsQuery;

      return {
        stockItems: stockItems || [],
        orders: orders || [],
        boats: boats || []
      };
    },
    enabled: !!user
  });

  if (isLoading) {
    return <div className="text-center p-8">Chargement des données...</div>;
  }

  const { stockItems, orders, boats } = operationalStats || { stockItems: [], orders: [], boats: [] };

  // Calculate statistics
  const totalStockValue = stockItems.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
  const lowStockItems = stockItems.filter(item => item.quantity <= item.min_threshold).length;
  const totalOrders = orders.length;
  const totalOrderValue = orders.reduce((sum, order) => {
    const orderTotal = order.order_items?.reduce((itemSum: number, item: any) => itemSum + (item.total_price || 0), 0) || 0;
    return sum + orderTotal;
  }, 0);

  // Boat availability
  const availableBoats = boats.filter(boat => boat.status === 'available').length;
  const maintenanceBoats = boats.filter(boat => boat.status === 'maintenance').length;
  const rentedBoats = boats.filter(boat => boat.status === 'rented').length;

  // Stock by category
  const stockByCategory = stockItems.reduce((acc: any[], item) => {
    const category = item.category || 'Autre';
    const existing = acc.find(cat => cat.category === category);
    if (existing) {
      existing.count += 1;
      existing.value += item.quantity * (item.unit_price || 0);
    } else {
      acc.push({
        category,
        count: 1,
        value: item.quantity * (item.unit_price || 0)
      });
    }
    return acc;
  }, []);

  // Boat status distribution
  const boatStatusData = [
    { name: 'Disponible', value: availableBoats, color: '#10b981' },
    { name: 'En maintenance', value: maintenanceBoats, color: '#f59e0b' },
    { name: 'En location', value: rentedBoats, color: '#3b82f6' }
  ];

  // Monthly order trend
  const monthlyOrderTrend = orders.reduce((acc: any[], order) => {
    const month = new Date(order.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
    const existing = acc.find(item => item.month === month);
    const orderValue = order.order_items?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0;
    
    if (existing) {
      existing.count += 1;
      existing.value += orderValue;
    } else {
      acc.push({
        month,
        count: 1,
        value: orderValue
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stockItems.length}</div>
                <p className="text-sm text-muted-foreground">Articles en Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{totalStockValue.toLocaleString()}€</div>
                <p className="text-sm text-muted-foreground">Valeur du Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{availableBoats}</div>
                <p className="text-sm text-muted-foreground">Bateaux Disponibles</p>
                <div className="text-sm text-muted-foreground">sur {boats.length} total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{totalOrderValue.toLocaleString()}€</div>
                <p className="text-sm text-muted-foreground">Commandes Période</p>
                <div className="text-sm text-muted-foreground">{totalOrders} commandes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Stock par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'value' ? `${value.toLocaleString()}€` : value,
                  name === 'value' ? 'Valeur' : 'Quantité'
                ]} />
                <Bar dataKey="count" fill="#3b82f6" name="Articles" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Boat Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Statut des Bateaux</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={boatStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {boatStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Order Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution des Commandes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyOrderTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name) => [
                name === 'value' ? `${value.toLocaleString()}€` : value,
                name === 'value' ? 'Valeur' : 'Nombre'
              ]} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Nombre" />
              <Line type="monotone" dataKey="value" stroke="#10b981" name="Valeur" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock Alerts */}
      {lowStockItems > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              Alertes Stock Bas ({lowStockItems} articles)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stockItems
                .filter(item => item.quantity <= item.min_threshold)
                .slice(0, 10)
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock actuel: {item.quantity} {item.unit} (Seuil: {item.min_threshold})
                      </p>
                    </div>
                    <Badge variant="destructive">
                      Stock bas
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}