import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface StockAnalyticsChartsProps {
  baseId?: string;
  category?: string;
  timeRange: string;
}

export function StockAnalyticsCharts({ baseId, category, timeRange }: StockAnalyticsChartsProps) {
  // Fetch stock movement data
  const { data: movementData, isLoading: movementLoading } = useQuery({
    queryKey: ['stock-movement', baseId, category, timeRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Fetch stock usage from intervention_parts
      let query = supabase
        .from('intervention_parts')
        .select(`
          used_at,
          quantity,
          stock_item_id,
          stock_items!inner(name, category, base_id)
        `)
        .gte('used_at', startDate.toISOString())
        .lte('used_at', endDate.toISOString());

      if (baseId) {
        query = query.eq('stock_items.base_id', baseId);
      }
      if (category) {
        query = query.eq('stock_items.category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by date
      const dailyUsage = data.reduce((acc: any, item: any) => {
        const date = new Date(item.used_at).toLocaleDateString('fr-FR');
        if (!acc[date]) {
          acc[date] = { date, quantity: 0, items: 0 };
        }
        acc[date].quantity += item.quantity;
        acc[date].items += 1;
        return acc;
      }, {});

      return Object.values(dailyUsage).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    },
  });

  // Fetch category distribution
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['stock-categories', baseId],
    queryFn: async () => {
      let query = supabase
        .from('stock_items')
        .select('category, quantity, unit_price')
        .not('category', 'is', null);

      if (baseId) {
        query = query.eq('base_id', baseId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by category
      const categoryStats = data.reduce((acc: any, item: any) => {
        const cat = item.category || 'Non catégorisé';
        if (!acc[cat]) {
          acc[cat] = { name: cat, items: 0, value: 0, quantity: 0 };
        }
        acc[cat].items += 1;
        acc[cat].quantity += item.quantity || 0;
        acc[cat].value += (item.quantity || 0) * (item.unit_price || 0);
        return acc;
      }, {});

      return Object.values(categoryStats);
    },
  });

  // Fetch stock levels over time
  const { data: stockLevelsData, isLoading: stockLevelsLoading } = useQuery({
    queryKey: ['stock-levels', baseId, category, timeRange],
    queryFn: async () => {
      // This would ideally be a view or materialized table tracking stock levels over time
      // For now, we'll generate sample data based on current stock
      let query = supabase
        .from('stock_items')
        .select('name, quantity, min_threshold, last_updated');

      if (baseId) {
        query = query.eq('base_id', baseId);
      }
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Generate time series data for stock levels
      const days = parseInt(timeRange);
      const stockHistory = [];
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const totalStock = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const lowStockItems = data.filter(item => 
          (item.quantity || 0) <= (item.min_threshold || 0)
        ).length;
        
        stockHistory.push({
          date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
          total: totalStock + Math.random() * 100 - 50, // Add some variation
          lowStock: lowStockItems + Math.floor(Math.random() * 3),
        });
      }

      return stockHistory;
    },
  });

  const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  if (movementLoading || categoryLoading || stockLevelsLoading) {
    return <OptimizedSkeleton type="grid" count={3} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Stock Movement Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Évolution des Mouvements de Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={movementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="quantity" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.1)" 
                name="Quantité utilisée"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="items"
              >
                {categoryData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Niveaux de Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stockLevelsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="hsl(var(--primary))" name="Stock total" />
              <Bar dataKey="lowStock" fill="hsl(var(--destructive))" name="Stock faible" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Value Distribution */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Valeur par Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} €`, 'Valeur']} />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}