import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MaintenanceReportsProps {
  data: any;
  dateRange: DateRange | undefined;
  isDirection: boolean;
  isChefBase: boolean;
}

export function MaintenanceReports({ data, dateRange, isDirection, isChefBase }: MaintenanceReportsProps) {
  if (!data) return <div className="text-center p-8">Aucune donnée disponible</div>;
  const stats = data;
  const { user } = useAuth();

  const { data: maintenanceStats, isLoading } = useQuery({
    queryKey: ['maintenance-reports', dateRange, user?.baseId],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = dateRange?.to?.toISOString() || new Date().toISOString();

      // Interventions statistics
      let interventionsQuery = supabase
        .from('interventions')
        .select(`
          *,
          boats(name, base_id),
          profiles(name)
        `)
        .gte('created_at', from)
        .lte('created_at', to);

      if (!isDirection && user?.baseId) {
        interventionsQuery = interventionsQuery.eq('base_id', user.baseId);
      }

      const { data: interventions } = await interventionsQuery;

      // Performance by technician
      let technicianQuery = supabase
        .from('interventions')
        .select(`
          technician_id,
          status,
          scheduled_date,
          completed_at,
          profiles(name)
        `)
        .gte('created_at', from)
        .lte('created_at', to);

      if (!isDirection && user?.baseId) {
        technicianQuery = technicianQuery.eq('base_id', user.baseId);
      }

      const { data: technicianPerformance } = await technicianQuery;

      return {
        interventions: interventions || [],
        technicianPerformance: technicianPerformance || []
      };
    },
    enabled: !!user
  });

  if (isLoading) {
    return <div className="text-center p-8">Chargement des données...</div>;
  }

  const interventions = maintenanceStats?.interventions || [];
  const technicianData = maintenanceStats?.technicianPerformance || [];

  // Calculate statistics
  const totalInterventions = interventions.length;
  const completedInterventions = interventions.filter(i => i.status === 'completed').length;
  const pendingInterventions = interventions.filter(i => i.status === 'scheduled').length;
  const inProgressInterventions = interventions.filter(i => i.status === 'in_progress').length;
  const completionRate = totalInterventions > 0 ? (completedInterventions / totalInterventions) * 100 : 0;

  // Group by status for chart
  const statusData = [
    { name: 'Terminées', value: completedInterventions, color: '#10b981' },
    { name: 'En cours', value: inProgressInterventions, color: '#f59e0b' },
    { name: 'En attente', value: pendingInterventions, color: '#ef4444' }
  ];

  // Group by month for trend
  const monthlyTrend = interventions.reduce((acc: any[], intervention) => {
    const month = format(new Date(intervention.created_at), 'MMM yyyy', { locale: fr });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.count += 1;
      if (intervention.status === 'completed') existing.completed += 1;
    } else {
      acc.push({
        month,
        count: 1,
        completed: intervention.status === 'completed' ? 1 : 0
      });
    }
    return acc;
  }, []);

  // Technician performance
  const technicianStats = technicianData.reduce((acc: any[], performance) => {
    if (!performance.technician_id || !performance.profiles?.name) return acc;
    
    const existing = acc.find(t => t.technician_id === performance.technician_id);
    if (existing) {
      existing.total += 1;
      if (performance.status === 'completed') existing.completed += 1;
    } else {
      acc.push({
        technician_id: performance.technician_id,
        name: performance.profiles.name,
        total: 1,
        completed: performance.status === 'completed' ? 1 : 0
      });
    }
    return acc;
  }, []).map(t => ({
    ...t,
    rate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalInterventions}</div>
            <p className="text-sm text-muted-foreground">Total Interventions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedInterventions}</div>
            <p className="text-sm text-muted-foreground">Terminées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{inProgressInterventions}</div>
            <p className="text-sm text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">Taux de completion</p>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Total" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" name="Terminées" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance */}
      {(isDirection || isChefBase) && technicianStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance des Techniciens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {technicianStats.map((tech) => (
                <div key={tech.technician_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{tech.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tech.completed}/{tech.total} interventions
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={tech.rate >= 80 ? 'default' : tech.rate >= 60 ? 'secondary' : 'destructive'}>
                      {tech.rate}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}