import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DateRange } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Ship, Clock, AlertTriangle, CheckCircle, Users, FileText } from 'lucide-react';
import { PreparationReportData } from '@/hooks/usePreparationReportsData';

interface PreparationReportsProps {
  data: PreparationReportData | undefined;
  dateRange: DateRange | undefined;
  isDirection: boolean;
  isChefBase: boolean;
}

export function PreparationReports({ data, dateRange, isDirection, isChefBase }: PreparationReportsProps) {
  if (!data) {
    return (
      <div className="text-center py-8">
        <Ship className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Aucune donnée de préparation disponible</p>
      </div>
    );
  }

  const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Ship className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{data.totalPreparations}</div>
                <p className="text-sm text-muted-foreground">Total Préparations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <div className="text-2xl font-bold text-success">{data.completedPreparations}</div>
                <p className="text-sm text-muted-foreground">Terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <div className="text-2xl font-bold">{data.averageCompletionTime}min</div>
                <p className="text-sm text-muted-foreground">Temps moyen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-2xl font-bold text-destructive">{data.anomaliesCount}</div>
                <p className="text-sm text-muted-foreground">Anomalies détectées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Taux de Réalisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Préparations terminées</span>
              <span className="font-medium">{data.completionRate}%</span>
            </div>
            <Progress value={data.completionRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

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
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="preparations" 
                  stroke="hsl(var(--primary))" 
                  name="Total"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="hsl(var(--success))" 
                  name="Terminées"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance */}
      {(isDirection || isChefBase) && data.technicianPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performance des Techniciens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.technicianPerformance.map((tech, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{tech.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{tech.completedPreparations}/{tech.totalPreparations} préparations</span>
                      <span>{tech.averageTime}min en moyenne</span>
                      {tech.anomaliesDetected > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {tech.anomaliesDetected} anomalies
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        tech.completionRate >= 90 ? 'default' : 
                        tech.completionRate >= 70 ? 'secondary' : 
                        'destructive'
                      }
                    >
                      {tech.completionRate}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boat Preparation Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Statistiques par Bateau
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.boatPreparationStats.map((boat, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{boat.boatName}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{boat.totalPreparations} préparations</span>
                    <span>{boat.averageTime}min en moyenne</span>
                    {boat.lastPreparation && (
                      <span>Dernière: {boat.lastPreparation}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {boat.anomaliesCount > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {boat.anomaliesCount} anomalies
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Usage */}
      {(isDirection || isChefBase) && data.templateUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Utilisation des Modèles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.templateUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="templateName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="usageCount" fill="hsl(var(--primary))" name="Utilisations" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}