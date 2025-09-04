import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRange } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ChecklistReportData } from '@/hooks/useReportsData';

interface ChecklistReportsProps {
  data: ChecklistReportData | undefined;
  dateRange: DateRange | undefined;
  isDirection: boolean;
  isChefBase: boolean;
}

export function ChecklistReports({ data, dateRange, isDirection, isChefBase }: ChecklistReportsProps) {
  if (!data) {
    return <div className="text-center p-8">Aucune donnée disponible pour cette période.</div>;
  }

  const stats = data;

  const completionRate = stats.totalChecklists > 0 ? (stats.completedChecklists / stats.totalChecklists) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalChecklists}</div>
            <p className="text-sm text-muted-foreground">Total Checklists</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.checkInCount}</div>
            <p className="text-sm text-muted-foreground">Check-ins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.checkOutCount}</div>
            <p className="text-sm text-muted-foreground">Check-outs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">Taux de completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.averageTime}min</div>
            <p className="text-sm text-muted-foreground">Temps moyen</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="checkIns" stroke="#3b82f6" name="Check-ins" />
                <Line type="monotone" dataKey="checkOuts" stroke="#10b981" name="Check-outs" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Boat Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisation des Bateaux</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.boatUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="boatName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" name="Heures d'utilisation" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Boat Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par Bateau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.boatUtilization.map((boat, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{boat.boatName}</p>
                  <p className="text-sm text-muted-foreground">
                    {boat.checkIns} check-ins • {boat.checkOuts} check-outs
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{boat.hours}h</p>
                  <Badge variant="outline">
                    {boat.balance === 'equilibre' ? 'Équilibré' : 'Déséquilibré'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}