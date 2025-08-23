import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useQueryClient } from '@tanstack/react-query';
import { FleetKPIGrid } from '@/components/boats/FleetKPIGrid';
import { BoatFleetCard } from '@/components/boats/BoatFleetCard';
import { MaintenanceAlertsPanel } from '@/components/boats/MaintenanceAlertsPanel';
import { FleetBadgesLegend } from '@/components/boats/FleetBadgesLegend';
import { InterventionDialog } from '@/components/maintenance/InterventionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateOilChangeStatus, getWorstOilChangeStatus } from '@/utils/engineMaintenanceUtils';
import { countExpiredControls } from '@/utils/safetyControlUtils';

export const BoatsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isInterventionDialogOpen, setIsInterventionDialogOpen] = useState(false);
  const [selectedBoatForIntervention, setSelectedBoatForIntervention] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch boats data
  const { data: boats = [] } = useOfflineData<any>({
    table: 'boats',
    baseId: user?.role !== 'direction' ? user?.baseId : undefined,
    dependencies: [user?.id, user?.role]
  });

  // Fetch safety controls
  const { data: safetyControls = [] } = useOfflineData<any>({
    table: 'boat_safety_controls',
    baseId: user?.role !== 'direction' ? user?.baseId : undefined,
    dependencies: [user?.id, user?.role]
  });

  // Fetch interventions
  const { data: interventions = [] } = useOfflineData<any>({
    table: 'interventions',
    baseId: user?.role !== 'direction' ? user?.baseId : undefined,
    dependencies: [user?.id, user?.role]
  });

  // Fetch alerts
  const { data: alerts = [] } = useOfflineData<any>({
    table: 'alerts',
    baseId: user?.role !== 'direction' ? user?.baseId : undefined,
    dependencies: [user?.id, user?.role]
  });

  // Fetch boat components for engine data
  const { data: boatComponents = [] } = useOfflineData<any>({
    table: 'boat_components',
    baseId: user?.role !== 'direction' ? user?.baseId : undefined,
    dependencies: [user?.id, user?.role]
  });

  // Calculate KPIs and maintenance alerts
  const { kpis, maintenanceAlerts, filteredBoats } = useMemo(() => {
    // Process boats with engine data using boat_components (same logic as BoatFleetCard)
    const boatsWithStatus = boats.map(boat => {
      // Get expired safety controls for this boat
      const boatSafetyControls = safetyControls.filter((control: any) => control.boat_id === boat.id);
      const expiredControlsCount = countExpiredControls(boatSafetyControls);
      
      // Get active alerts for this boat
      const boatAlerts = alerts.filter((alert: any) => 
        alert.is_read === false && 
        (alert.boat_id === boat.id || alert.message.includes(boat.name))
      );

      // Get engine components for this boat
      const engines = boatComponents.filter((comp: any) => 
        comp.boat_id === boat.id && 
        comp.component_type?.toLowerCase().includes('moteur')
      );

      // Calculate oil change status using same logic as BoatFleetCard
      const oilStatus = getWorstOilChangeStatus(engines);

      return {
        ...boat,
        expiredControlsCount,
        alertsCount: boatAlerts.length,
        engines,
        oilStatus
      };
    });

    // Calculate oil change urgencies using boat_components data
    const urgentOilChanges = boatsWithStatus.filter(boat => 
      boat.oilStatus.isOverdue
    ).length;

    // Calculate KPIs
    const expiredControls = boatsWithStatus.reduce((total, boat) => total + boat.expiredControlsCount, 0);
    const overdueInterventions = interventions.filter((intervention: any) => 
      intervention.status === 'scheduled' && 
      new Date(intervention.scheduled_date) < new Date()
    ).length;

    const kpis = {
      totalBoats: boats.length,
      urgentOilChanges,
      expiredControls,
      overdueInterventions
    };

    // Generate maintenance alerts
    const maintenanceAlerts: any[] = [];
    
    boatsWithStatus.forEach(boat => {
      // Safety control alerts
      if (boat.expiredControlsCount > 0) {
        maintenanceAlerts.push({
          id: `safety-${boat.id}`,
          type: 'safety_control',
          boatId: boat.id,
          boatName: boat.name,
          message: `${boat.expiredControlsCount} contrôle(s) de sécurité expiré(s)`,
          urgency: 'critical'
        });
      }

      // Oil change alerts using boat_components data
      if (boat.oilStatus.isOverdue) {
        maintenanceAlerts.push({
          id: `oil-${boat.id}`,
          type: 'oil_change',
          boatId: boat.id,
          boatName: boat.name,
          message: `Vidange urgente nécessaire (${boat.oilStatus.hoursSinceLastChange}h)`,
          urgency: 'critical',
          hoursSinceLastChange: boat.oilStatus.hoursSinceLastChange
        });
      }
    });

    // Sort alerts by urgency
    maintenanceAlerts.sort((a, b) => {
      const urgencyOrder = { critical: 0, warning: 1, info: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });

    // Filter boats based on search and status
    const filteredBoats = boatsWithStatus.filter(boat => {
      const matchesSearch = boat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           boat.model.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || boat.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return { kpis, maintenanceAlerts, filteredBoats };
  }, [boats, safetyControls, interventions, alerts, boatComponents, searchTerm, statusFilter]);

  const handleCreateIntervention = (boatId: string, boatName?: string) => {
    setSelectedBoatForIntervention({ id: boatId, name: boatName || '' });
    setIsInterventionDialogOpen(true);
  };

  const handleCloseInterventionDialog = async () => {
    setIsInterventionDialogOpen(false);
    setSelectedBoatForIntervention(null);
    
    // Force fresh data reload instead of full page reload
    console.log('🔄 Refreshing dashboard data after intervention dialog close');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['boats'] }),
      queryClient.invalidateQueries({ queryKey: ['boat-engines'] }),
      queryClient.invalidateQueries({ queryKey: ['interventions'] }),
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    ]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Flotte</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Vue d'ensemble de la maintenance et des alertes
          </p>
        </div>
      </div>

      {/* KPIs Grid */}
      <FleetKPIGrid {...kpis} />

      {/* Badges Legend */}
      <FleetBadgesLegend />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main boats grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un bateau..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="available">Disponible</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="in_use">En cours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Boats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBoats.map((boat) => (
              <BoatFleetCard
                key={boat.id}
                boat={boat}
                alertsCount={boat.alertsCount}
                onCreateIntervention={handleCreateIntervention}
              />
            ))}
          </div>

          {filteredBoats.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun bateau trouvé avec les filtres actuels</p>
            </div>
          )}
        </div>

        {/* Alerts panel */}
        <div className="lg:col-span-1">
          <MaintenanceAlertsPanel alerts={maintenanceAlerts} />
        </div>
      </div>

      {/* Intervention Dialog */}
      <InterventionDialog
        isOpen={isInterventionDialogOpen}
        onClose={handleCloseInterventionDialog}
        intervention={selectedBoatForIntervention ? {
          id: '',
          title: `Maintenance ${selectedBoatForIntervention.name}`,
          description: '',
          boatId: selectedBoatForIntervention.id,
          technicianId: '',
          status: 'scheduled',
          scheduledDate: new Date().toISOString().split('T')[0],
          baseId: user?.baseId || '',
          interventionType: 'maintenance'
        } as any : null}
      />
    </div>
  );
};