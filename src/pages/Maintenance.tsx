import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Wrench, Calendar, FileText, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaintenanceInterventions } from '@/components/maintenance/MaintenanceInterventions';
import { TechnicianInterventions } from '@/components/maintenance/TechnicianInterventions';
import { PreventiveMaintenance } from '@/components/maintenance/PreventiveMaintenance';
import { GanttMaintenanceSchedule } from '@/components/maintenance/GanttMaintenanceSchedule';
import { MaintenanceHistory } from '@/components/maintenance/MaintenanceHistory';
import { useAuth } from '@/contexts/AuthContext';

export default function Maintenance() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('interventions');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab && ['interventions', 'preventive', 'gantt', 'history'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Gestion complète des interventions et maintenance préventive
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="interventions" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm">
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Interventions</span>
            <span className="xs:hidden">Interv.</span>
          </TabsTrigger>
          <TabsTrigger value="preventive" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Maintenance préventive</span>
            <span className="xs:hidden">Prév.</span>
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Planning Définitif</span>
            <span className="sm:hidden">Planning</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm">
            <History className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Historique</span>
            <span className="xs:hidden">Hist.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interventions">
          {user?.role === 'technicien' ? (
            <TechnicianInterventions />
          ) : (
            <MaintenanceInterventions />
          )}
        </TabsContent>

        <TabsContent value="preventive">
          <PreventiveMaintenance />
        </TabsContent>

        <TabsContent value="gantt">
          <GanttMaintenanceSchedule />
        </TabsContent>

        <TabsContent value="history">
          <MaintenanceHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}