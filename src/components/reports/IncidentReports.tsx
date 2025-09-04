import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRange } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Shield, Wrench } from 'lucide-react';
import { IncidentReportData } from '@/hooks/useReportsData';

interface IncidentReportsProps {
  data: IncidentReportData | undefined;
  dateRange: DateRange | undefined;
  isDirection: boolean;
  isChefBase: boolean;
}

export function IncidentReports({ data, dateRange, isDirection, isChefBase }: IncidentReportsProps) {
  if (!data) {
    return <div className="text-center p-8">Aucune donnée disponible pour cette période.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{data.totalIncidents}</div>
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
                <div className="text-2xl font-bold text-green-600">{data.resolvedIncidents}</div>
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
                <div className="text-2xl font-bold">{data.totalBoats}</div>
                <p className="text-sm text-muted-foreground">Total Bateaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{data.availableBoats}</div>
            <p className="text-sm text-muted-foreground">Disponibles</p>
            <div className="text-sm text-orange-600 mt-1">{data.maintenanceBoats} en maintenance</div>
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
                  data={data.severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.severityData.map((entry, index) => (
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
              <BarChart data={data.incidentTypes}>
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
            {data.recentIncidents.map((incident) => (
              <div key={incident.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <p className="font-medium">{incident.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {incident.boat} • {incident.date}
                  </p>
                </div>
                <div className="ml-4">
                  <Badge variant={incident.status === 'completed' ? 'default' : 'destructive'}>
                    {incident.status === 'completed' ? 'Résolu' : 'En cours'}
                  </Badge>
                </div>
              </div>
            ))}
            {data.recentIncidents.length === 0 && (
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