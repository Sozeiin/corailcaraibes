import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Shield, Wrench } from 'lucide-react';

interface IncidentReportsProps {
  dateRange: DateRange | undefined;
  isDirection: boolean;
  isChefBase: boolean;
}

export function IncidentReports({ dateRange, isDirection, isChefBase }: IncidentReportsProps) {
  const { user } = useAuth();

  const { data: incidentStats, isLoading } = useQuery({
    queryKey: ['incident-reports', dateRange, user?.baseId],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = dateRange?.to?.toISOString() || new Date().toISOString();

      // Get maintenance alerts/incidents
      let alertsQuery = supabase
        .from('interventions')
        .select(`
          *,
          boats(name, base_id)
        `)
        .eq('priority', 'urgent')
        .gte('created_at', from)
        .lte('created_at', to);

      if (!isDirection && user?.baseId) {
        alertsQuery = alertsQuery.eq('base_id', user.baseId);
      }

      const { data: urgentInterventions } = await alertsQuery;

      // Get boat safety data (using boat_safety_controls if it exists)
      let boatsQuery = supabase
        .from('boats')
        .select(`
          *
        `)
        .gte('updated_at', from)
        .lte('updated_at', to);

      if (!isDirection && user?.baseId) {
        boatsQuery = boatsQuery.eq('base_id', user.baseId);
      }

      const { data: boatsData } = await boatsQuery;

      return {
        urgentInterventions: urgentInterventions || [],
        boatsData: boatsData || []
      };
    },
    enabled: !!user
  });

  if (isLoading) {
    return <div className="text-center p-8">Chargement des données...</div>;
  }

  const urgentInterventions = incidentStats?.urgentInterventions || [];
  const boatsData = incidentStats?.boatsData || [];

  // Calculate statistics
  const totalIncidents = urgentInterventions.length;
  const resolvedIncidents = urgentInterventions.filter(i => i.status === 'completed').length;
  const pendingIncidents = urgentInterventions.filter(i => i.status !== 'completed').length;

  const totalBoats = boatsData.length;
  const availableBoats = boatsData.filter(b => b.status === 'available').length;
  const maintenanceBoats = boatsData.filter(b => b.status === 'maintenance').length;

  // Incident severity distribution
  const severityData = [
    { name: 'Critique', value: urgentInterventions.filter(i => i.description?.includes('critique')).length, color: '#ef4444' },
    { name: 'Majeur', value: urgentInterventions.filter(i => i.description?.includes('majeur')).length, color: '#f59e0b' },
    { name: 'Mineur', value: urgentInterventions.filter(i => !i.description?.includes('critique') && !i.description?.includes('majeur')).length, color: '#10b981' }
  ];

  // Incident types
  const incidentTypes = urgentInterventions.reduce((acc: any[], intervention) => {
    const type = intervention.intervention_type || 'Autre';
    const existing = acc.find(item => item.type === type);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ type, count: 1 });
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
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{totalIncidents}</div>
                <p className="text-sm text-muted-foreground">Incidents Urgents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{resolvedIncidents}</div>
                <p className="text-sm text-muted-foreground">Résolus</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{totalBoats}</div>
                <p className="text-sm text-muted-foreground">Total Bateaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{availableBoats}</div>
            <p className="text-sm text-muted-foreground">Disponibles</p>
            <div className="text-sm text-orange-600 mt-1">{maintenanceBoats} en maintenance</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Sévérité</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incident Types */}
        <Card>
          <CardHeader>
            <CardTitle>Types d'Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentTypes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Incidents Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {urgentInterventions.slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <p className="font-medium">{incident.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {incident.boats?.name} • {new Date(incident.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm mt-1">{incident.description}</p>
                </div>
                <div className="ml-4">
                  <Badge variant={incident.status === 'completed' ? 'default' : 'destructive'}>
                    {incident.status === 'completed' ? 'Résolu' : 'En cours'}
                  </Badge>
                </div>
              </div>
            ))}
            {urgentInterventions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun incident urgent dans la période sélectionnée
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}