
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Ship, 
  Wrench, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <Card className="card-hover">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend > 0 ? '+' : ''}{trend}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AlertItem = ({ type, message, severity }: any) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-3">
      <AlertTriangle className={`h-5 w-5 ${
        severity === 'error' ? 'text-red-500' : 
        severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
      }`} />
      <span className="text-sm">{message}</span>
    </div>
    <Badge variant={severity === 'error' ? 'destructive' : 'secondary'}>
      {severity === 'error' ? 'Urgent' : 'Info'}
    </Badge>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [baseName, setBaseName] = useState<string>('');

  useEffect(() => {
    const fetchBaseName = async () => {
      if (user?.baseId && user.role !== 'direction') {
        const { data } = await supabase
          .from('bases')
          .select('name')
          .eq('id', user.baseId)
          .single();
        
        if (data) {
          setBaseName(data.name);
        }
      }
    };

    fetchBaseName();
  }, [user?.baseId, user?.role]);

  const stats = [
    {
      title: 'Bateaux Total',
      value: '24',
      icon: Ship,
      trend: 8,
      color: 'bg-marine-500'
    },
    {
      title: 'En Maintenance',
      value: '3',
      icon: Wrench,
      trend: -12,
      color: 'bg-orange-500'
    },
    {
      title: 'Stock Critique',
      value: '7',
      icon: Package,
      trend: 5,
      color: 'bg-red-500'
    },
    {
      title: 'Revenus Mensuel',
      value: '€85,420',
      icon: DollarSign,
      trend: 12,
      color: 'bg-green-500'
    }
  ];

  const alerts = [
    { type: 'stock', message: 'Stock moteur 40CV critique (2 unités)', severity: 'error' },
    { type: 'maintenance', message: 'Catamaran "Évasion" - maintenance prévue demain', severity: 'warning' },
    { type: 'document', message: 'Certificat de sécurité "Neptune" expire dans 10 jours', severity: 'warning' },
  ];

  const upcomingMaintenance = [
    { boat: 'Évasion', date: '2024-07-03', type: 'Révision moteur' },
    { boat: 'Neptune', date: '2024-07-05', type: 'Inspection coque' },
    { boat: 'Odyssée', date: '2024-07-08', type: 'Maintenance générale' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
           <p className="text-gray-600">
             Bienvenue, {user?.name} • {user?.role === 'direction' ? 'Vue globale' : baseName || 'Chargement...'}
           </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Planification
          </Button>
          <Button className="btn-ocean">
            Nouveau rapport
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertes Récentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <AlertItem key={index} {...alert} />
            ))}
            <Button variant="outline" className="w-full mt-4">
              Voir toutes les alertes
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              Maintenances Programmées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMaintenance.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{item.boat}</p>
                  <p className="text-xs text-gray-600">{item.type}</p>
                </div>
                <Badge variant="outline">
                  {new Date(item.date).toLocaleDateString('fr-FR')}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              Planifier maintenance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-marine-500" />
            État de la Flotte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Disponibles</span>
                <span className="text-sm text-gray-600">18/24</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">En Location</span>
                <span className="text-sm text-gray-600">15/24</span>
              </div>
              <Progress value={62.5} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Maintenance</span>
                <span className="text-sm text-gray-600">3/24</span>
              </div>
              <Progress value={12.5} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
