import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
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
  Clock,
  Anchor
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CheckInOutDialog } from '@/components/checkin/CheckInOutDialog';
import { DashboardGridLayout } from '@/components/dashboard/DashboardGridLayout';
import WeatherWidget from '@/components/weather/WeatherWidget';
import { TechnicianDashboard } from '@/components/dashboard/TechnicianDashboard';

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <Card className="card-hover">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend > 0 ? '+' : ''}{trend}%
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${color} flex-shrink-0`}>
          <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AlertItem = ({ type, message, severity }: any) => (
  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
      <AlertTriangle className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
        severity === 'error' ? 'text-red-500' : 
        severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
      }`} />
      <span className="text-xs sm:text-sm truncate">{message}</span>
    </div>
    <Badge variant={severity === 'error' ? 'destructive' : 'secondary'} className="text-xs flex-shrink-0">
      {severity === 'error' ? 'Urgent' : 'Info'}
    </Badge>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();

  // Early return if no user to prevent rendering errors
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // Interface spécialisée pour les techniciens
  if (user.role === 'technicien') {
    return <TechnicianDashboard />;
  }

  return <StandardDashboard />;
}

function StandardDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [baseName, setBaseName] = useState<string>('');
  const [checkInOutDialogOpen, setCheckInOutDialogOpen] = useState(false);

  const { data: bases = [] } = useOfflineData<any>({ table: 'bases' });

  useEffect(() => {
    if (user?.baseId && user.role !== 'direction') {
      const base = bases.find((b: any) => b.id === user.baseId);
      if (base?.name) {
        setBaseName(base.name);
      }
    }
  }, [bases, user]);

  const {
    data: rawInterventions = [],
    loading: interventionsLoading
  } = useOfflineData<any>({
    table: 'interventions',
    baseId: user?.role !== 'direction' ? user?.baseId : undefined,
    dependencies: [user?.id, user?.role]
  });

  const { data: boats = [] } = useOfflineData<any>({ table: 'boats' });

  const interventions = rawInterventions.map((i: any) => ({
    ...i,
    boats: boats.find((b: any) => b.id === i.boat_id) || null
  }));

  const { data: rawAlerts = [] } = useOfflineData<any>({
    table: 'alerts',
    baseId: user?.role !== 'direction' ? user?.baseId : undefined,
    dependencies: [user?.baseId, user?.role]
  });

  const alerts = rawAlerts
    .filter((a: any) => a.is_read === false)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((alert: any) => ({
      type: alert.type,
      message: alert.message,
      severity: alert.severity
    }));

  // Calcul des statistiques avec vérifications défensives
  const myInterventions = user?.role === 'technicien' ? 
    (interventions || []).filter(i => i?.technician_id === user.id) : [];
  const availableInterventions = user?.role === 'technicien' ? 
    (interventions || []).filter(i => i?.technician_id === null && i?.base_id === user.baseId) : [];
  const pendingInterventions = (interventions || []).filter(i => 
    i?.status === 'scheduled' || i?.status === 'in_progress'
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
      value: (interventions || []).length.toString(),
      icon: Wrench,
      color: 'bg-marine-500'
    },
    {
      title: 'En Cours',
      value: (interventions || []).filter(i => i?.status === 'in_progress').length.toString(),
      icon: Clock,
      color: 'bg-blue-500'
    },
    {
      title: 'Programmées',
      value: (interventions || []).filter(i => i?.status === 'scheduled').length.toString(),
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      title: 'Terminées',
      value: (interventions || []).filter(i => i?.status === 'completed').length.toString(),
      icon: Package,
      color: 'bg-green-500'
    }
  ];

  const upcomingMaintenance = (interventions || [])
    .filter(i => i?.status === 'scheduled' || i?.status === 'in_progress')
    .slice(0, 5)
    .map(i => ({
      id: i?.id || '',
      boat: i?.boats?.name || 'Bateau inconnu',
      date: i?.scheduled_date || new Date().toISOString(),
      type: i?.title || 'Intervention',
      status: i?.status || 'scheduled',
      isAssignedToMe: user?.role === 'technicien' && i?.technician_id === user.id
    }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de Bord</h1>
           <p className="text-gray-600 text-sm sm:text-base">
             Bienvenue, {user?.name} • {user?.role === 'direction' ? 'Vue globale' : baseName || 'Chargement...'}
           </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs sm:text-sm"
            onClick={() => navigate('/maintenance?tab=gantt')}
          >
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Planification
          </Button>
          <Button 
            onClick={() => setCheckInOutDialogOpen(true)}
            className="btn-ocean text-xs sm:text-sm" 
            size="sm"
          >
            <Anchor className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Check-in / Check-out
          </Button>
        </div>
      </div>

      {/* Customizable Dashboard Grid with Drag & Drop */}
      <DashboardGridLayout />

      <CheckInOutDialog 
        open={checkInOutDialogOpen}
        onOpenChange={setCheckInOutDialogOpen}
      />
    </div>
  );
}