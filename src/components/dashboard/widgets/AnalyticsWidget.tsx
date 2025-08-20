import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WidgetProps } from '@/types/widget';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AnalyticsWidget = ({ config }: WidgetProps) => {
  const interventions = useOfflineData<any>({ table: 'interventions' });
  const orders = useOfflineData<any>({ table: 'orders' });
  const bases = useOfflineData<any>({ table: 'bases' });

  const chartData = useMemo(() => {
    if (interventions.loading || orders.loading || bases.loading || 
        !interventions.data || !orders.data || !bases.data) return [];

    const basesData = bases.data || [];
    
    return basesData.map(base => {
      const baseInterventions = interventions.data.filter(i => i.base_id === base.id);
      const baseOrders = orders.data.filter(o => o.base_id === base.id);
      
      return {
        name: base.name,
        interventions: baseInterventions.length,
        commandes: baseOrders.length,
        completed: baseInterventions.filter(i => i.status === 'completed').length,
      };
    });
  }, [interventions.data, orders.data, bases.data, interventions.loading, orders.loading, bases.loading]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Chargement des données...
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar 
                  dataKey="interventions" 
                  fill="hsl(var(--primary))" 
                  name="Interventions"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="commandes" 
                  fill="hsl(var(--secondary))" 
                  name="Commandes"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="completed" 
                  fill="hsl(var(--accent))" 
                  name="Terminées"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};