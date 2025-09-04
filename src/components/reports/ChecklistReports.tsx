import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChecklistReportsProps {
  dateRange: DateRange | undefined;
  isDirection: boolean;
  isChefBase: boolean;
}

export function ChecklistReports({ dateRange, isDirection, isChefBase }: ChecklistReportsProps) {
  const { user } = useAuth();

  const { data: checklistStats, isLoading } = useQuery({
    queryKey: ['checklist-reports', dateRange, user?.baseId],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = dateRange?.to?.toISOString() || new Date().toISOString();

      // This would need to be adapted based on your checklist data structure
      // For now, I'll create a mock structure that represents typical checklist data
      
      return {
        totalChecklists: 156,
        completedChecklists: 142,
        checkInCount: 78,
        checkOutCount: 78,
        averageTime: 45, // minutes
        boatUtilization: [
          { boatName: 'Navire 1', checkIns: 12, checkOuts: 12, hours: 96 },
          { boatName: 'Navire 2', checkIns: 8, checkOuts: 8, hours: 64 },
          { boatName: 'Navire 3', checkIns: 15, checkOuts: 15, hours: 120 },
        ],
        monthlyTrend: [
          { month: 'Jan 2024', checkIns: 45, checkOuts: 43 },
          { month: 'Fév 2024', checkIns: 52, checkOuts: 50 },
          { month: 'Mar 2024', checkIns: 48, checkOuts: 47 },
        ]
      };
    },
    enabled: !!user
  });

  if (isLoading) {
    return <div className="text-center p-8">Chargement des données...</div>;
  }

  const stats = checklistStats || {
    totalChecklists: 0,
    completedChecklists: 0,
    checkInCount: 0,
    checkOutCount: 0,
    averageTime: 0,
    boatUtilization: [],
    monthlyTrend: []
  };

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
                    {boat.checkIns === boat.checkOuts ? 'Équilibré' : 'Déséquilibré'}
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