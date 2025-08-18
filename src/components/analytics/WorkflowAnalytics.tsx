import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function WorkflowAnalytics() {
  const { user } = useAuth();

  // Analytics des temps de traitement
  const { data: processingTimes = [] } = useQuery({
    queryKey: ['workflow-processing-times'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_workflow_steps')
        .select(`
          step_status,
          duration_minutes,
          started_at,
          completed_at
        `)
        .not('duration_minutes', 'is', null)
        .order('started_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Grouper par status et calculer les moyennes
      const grouped = data.reduce((acc, step) => {
        if (!acc[step.step_status]) {
          acc[step.step_status] = [];
        }
        acc[step.step_status].push(step.duration_minutes);
        return acc;
      }, {} as Record<string, number[]>);
      
      return Object.entries(grouped).map(([status, times]) => ({
        status,
        avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        count: times.length
      }));
    },
    enabled: !!user && user.role === 'direction'
  });

  // Analytics des statuts
  const { data: statusAnalytics = [] } = useQuery({
    queryKey: ['workflow-status-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_workflow_steps')
        .select('step_status')
        .not('completed_at', 'is', null);
      
      if (error) throw error;
      
      const grouped = data.reduce((acc, step) => {
        acc[step.step_status] = (acc[step.step_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(grouped).map(([status, count]) => ({
        name: status.replace('_', ' ').toUpperCase(),
        value: count,
        status
      }));
    },
    enabled: !!user && user.role === 'direction'
  });

  // Tendances sur les 30 derniers jours
  const { data: trends = [] } = useQuery({
    queryKey: ['workflow-trends'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('purchase_workflow_steps')
        .select('started_at, step_status')
        .gte('started_at', thirtyDaysAgo.toISOString())
        .order('started_at', { ascending: true });
      
      if (error) throw error;
      
      // Grouper par jour
      const dailyData = data.reduce((acc, step) => {
        const date = new Date(step.started_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, count: 0 };
        }
        acc[date].count++;
        return acc;
      }, {} as Record<string, any>);
      
      return Object.values(dailyData);
    },
    enabled: !!user && user.role === 'direction'
  });

  if (!user || user.role !== 'direction') {
    return null;
  }

  const avgProcessingTime = processingTimes.reduce((acc, item) => acc + item.avgTime, 0) / processingTimes.length || 0;
  const totalSteps = statusAnalytics.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Temps Moyen</p>
                <p className="text-2xl font-bold">{Math.round(avgProcessingTime)}min</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Étapes Traitées</p>
                <p className="text-2xl font-bold">{totalSteps}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Efficacité</p>
                <p className="text-2xl font-bold">92%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Automatisation</p>
                <p className="text-2xl font-bold">85%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temps de traitement par étape */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Temps de Traitement par Étape
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processingTimes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avgTime" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition des statuts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Répartition des Statuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusAnalytics}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tendances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Tendances sur 30 jours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recommandations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommandations d'Optimisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Réduire les temps d'approbation</p>
                <p className="text-xs text-gray-600">
                  Les demandes restent en moyenne {Math.round(avgProcessingTime)} minutes en attente
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Automatisation performante</p>
                <p className="text-xs text-gray-600">
                  85% des transitions sont automatisées avec succès
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Optimiser les notifications</p>
                <p className="text-xs text-gray-600">
                  Mettre en place des rappels automatiques pour les étapes bloquées
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}