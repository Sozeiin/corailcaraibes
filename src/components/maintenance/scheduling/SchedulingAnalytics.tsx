import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export function SchedulingAnalytics() {
  const [timeRange, setTimeRange] = useState('30');
  const [isLoading] = useState(false);

  // Mock data - in real implementation, this would come from your API
  const performanceData = [
    { month: 'Jan', scheduled: 45, completed: 42, onTime: 38, delayed: 4 },
    { month: 'Fév', scheduled: 52, completed: 48, onTime: 45, delayed: 3 },
    { month: 'Mar', scheduled: 38, completed: 36, onTime: 34, delayed: 2 },
    { month: 'Avr', scheduled: 61, completed: 58, onTime: 52, delayed: 6 },
    { month: 'Mai', scheduled: 49, completed: 47, onTime: 44, delayed: 3 },
    { month: 'Juin', scheduled: 55, completed: 52, onTime: 49, delayed: 3 }
  ];

  const scheduleDistribution = [
    { name: 'Révisions moteur', value: 35, color: '#3b82f6' },
    { name: 'Inspections coque', value: 25, color: '#10b981' },
    { name: 'Maintenance électrique', value: 20, color: '#f59e0b' },
    { name: 'Vérifications sécurité', value: 15, color: '#ef4444' },
    { name: 'Autres', value: 5, color: '#8b5cf6' }
  ];

  const weeklySchedule = [
    { day: 'Lun', planned: 8, completed: 7, efficiency: 87.5 },
    { day: 'Mar', planned: 6, completed: 6, efficiency: 100 },
    { day: 'Mer', planned: 9, completed: 8, efficiency: 88.9 },
    { day: 'Jeu', planned: 7, completed: 6, efficiency: 85.7 },
    { day: 'Ven', planned: 5, completed: 5, efficiency: 100 },
    { day: 'Sam', planned: 3, completed: 3, efficiency: 100 },
    { day: 'Dim', planned: 2, completed: 2, efficiency: 100 }
  ];

  const metrics = {
    totalScheduled: 287,
    completionRate: 91.3,
    onTimeRate: 85.7,
    averageLeadTime: 5.2,
    schedulingAccuracy: 92.1,
    resourceUtilization: 78.5
  };

  const getCompletionRateBadge = (rate: number) => {
    if (rate >= 95) return <Badge variant="default">Excellent</Badge>;
    if (rate >= 85) return <Badge variant="secondary">Bon</Badge>;
    if (rate >= 70) return <Badge variant="outline">Moyen</Badge>;
    return <Badge variant="destructive">Faible</Badge>;
  };

  if (isLoading) {
    return <OptimizedSkeleton type="grid" count={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-md font-semibold">Analytiques de Planification</h4>
          <p className="text-sm text-muted-foreground">
            Analysez les performances de la planification automatique
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
            <SelectItem value="365">1 année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Programmé</p>
                <p className="text-2xl font-bold">{metrics.totalScheduled}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de Réalisation</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completionRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ponctualité</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.onTimeRate}%</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Délai Moyen</p>
                <p className="text-2xl font-bold">{metrics.averageLeadTime}j</p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Précision</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.schedulingAccuracy}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisation</p>
                <p className="text-2xl font-bold text-teal-600">{metrics.resourceUtilization}%</p>
              </div>
              <Activity className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tendances de Performance</CardTitle>
            <CardDescription>Évolution des maintenances planifiées et réalisées</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="scheduled" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  name="Programmées"
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  name="Réalisées"
                />
                <Line 
                  type="monotone" 
                  dataKey="onTime" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  name="À temps"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par Type</CardTitle>
            <CardDescription>Distribution des maintenances planifiées</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scheduleDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {scheduleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse Hebdomadaire</CardTitle>
          <CardDescription>Performance par jour de la semaine</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklySchedule}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="planned" fill="#3b82f6" name="Programmées" />
              <Bar dataKey="completed" fill="#10b981" name="Réalisées" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Points Forts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Taux de réalisation élevé</span>
                </div>
                <Badge variant="default">91.3%</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Précision de planification</span>
                </div>
                <Badge variant="secondary">92.1%</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Utilisation des ressources</span>
                </div>
                <Badge variant="outline">78.5%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Axes d'Amélioration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Réduction des retards</span>
                </div>
                <Badge variant="destructive">14.3%</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Optimisation des ressources</span>
                </div>
                <Badge variant="outline">+21.5%</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Délai de préparation</span>
                </div>
                <Badge variant="destructive">5.2j</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}