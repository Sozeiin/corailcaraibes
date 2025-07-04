
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Users,
  Clock
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

  // Récupération des interventions filtrées pour les techniciens
  const { data: interventions = [], isLoading: interventionsLoading } = useQuery({
    queryKey: ['dashboard-interventions', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('interventions')
        .select(`
          *,
          boats(name, model)
        `)
        .order('scheduled_date', { ascending: true });

      // Filtrage selon le rôle de l'utilisateur
      if (user.role === 'technicien') {
        // Pour les techniciens : interventions assignées OU dans leur base ET non assignées
        query = query.or(`technician_id.eq.${user.id},and(base_id.eq.${user.baseId},technician_id.is.null)`);
      } else if (user.role === 'chef_base') {
        // Pour les chefs de base : toutes les interventions de leur base
        query = query.eq('base_id', user.baseId);
      }
      // Pour la direction : toutes les interventions (pas de filtre)

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user
  });

  // Récupération des alertes pour le tableau de bord
  const { data: alerts = [] } = useQuery({
    queryKey: ['dashboard-alerts', user?.baseId, user?.role],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      // Filtrage selon le rôle
      if (user.role !== 'direction') {
        query = query.eq('base_id', user.baseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data?.map(alert => ({
        type: alert.type,
        message: alert.message,
        severity: alert.severity
      })) || [];
    },
    enabled: !!user
  });

  // Calcul des statistiques
  const myInterventions = user?.role === 'technicien' ? interventions.filter(i => i.technician_id === user.id) : [];
  const availableInterventions = user?.role === 'technicien' ? interventions.filter(i => i.technician_id === null && i.base_id === user.baseId) : [];
  const pendingInterventions = interventions.filter(i => 
    i.status === 'scheduled' || i.status === 'in_progress'
  );

  const stats = user?.role === 'technicien' ? [
    {
      title: 'Mes Interventions',
      value: myInterventions.length.toString(),
      icon: Wrench,
      color: 'bg-marine-500'
    },
    {
      title: 'Disponibles',
      value: availableInterventions.length.toString(),
      icon: Clock,
      color: 'bg-blue-500'
    },
    {
      title: 'En Attente',
      value: pendingInterventions.length.toString(),
      icon: AlertTriangle,
      color: 'bg-orange-500'
    },
    {
      title: 'À Terminer',
      value: myInterventions.filter(i => i.status === 'in_progress').length.toString(),
      icon: Package,
      color: 'bg-green-500'
    }
  ] : [
    {
      title: 'Interventions Total',
      value: interventions.length.toString(),
      icon: Wrench,
      color: 'bg-marine-500'
    },
    {
      title: 'En Cours',
      value: interventions.filter(i => i.status === 'in_progress').length.toString(),
      icon: Clock,
      color: 'bg-blue-500'
    },
    {
      title: 'Programmées',
      value: interventions.filter(i => i.status === 'scheduled').length.toString(),
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      title: 'Terminées',
      value: interventions.filter(i => i.status === 'completed').length.toString(),
      icon: Package,
      color: 'bg-green-500'
    }
  ];

  const upcomingMaintenance = interventions
    .filter(i => i.status === 'scheduled' || i.status === 'in_progress')
    .slice(0, 5)
    .map(i => ({
      id: i.id,
      boat: i.boats?.name || 'Bateau inconnu',
      date: i.scheduled_date,
      type: i.title,
      status: i.status,
      isAssignedToMe: user?.role === 'technicien' && i.technician_id === user.id
    }));

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
            {upcomingMaintenance.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune intervention programmée</p>
            ) : (
              upcomingMaintenance.map((item, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                  item.isAssignedToMe ? 'bg-marine-50 border-l-4 border-marine-500' : 'bg-gray-50'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.boat}</p>
                      {item.isAssignedToMe && (
                        <Badge variant="default" className="bg-marine-500 text-xs">
                          Assignée
                        </Badge>
                      )}
                      {!item.isAssignedToMe && user?.role === 'technicien' && (
                        <Badge variant="outline" className="text-xs">
                          Disponible
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{item.type}</p>
                    <p className="text-xs text-gray-500">
                      Statut: {item.status === 'scheduled' ? 'Programmée' : 'En cours'}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {new Date(item.date).toLocaleDateString('fr-FR')}
                  </Badge>
                </div>
              ))
            )}
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
