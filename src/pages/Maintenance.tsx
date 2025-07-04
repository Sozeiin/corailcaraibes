import React, { useState } from 'react';
import { Wrench, Calendar, FileText, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaintenanceInterventions } from '@/components/maintenance/MaintenanceInterventions';
import { TechnicianInterventions } from '@/components/maintenance/TechnicianInterventions';
import { PreventiveMaintenance } from '@/components/maintenance/PreventiveMaintenance';
import { MaintenanceSchedule } from '@/components/maintenance/MaintenanceSchedule';
import { MaintenanceHistory } from '@/components/maintenance/MaintenanceHistory';
import { useAuth } from '@/contexts/AuthContext';

export default function Maintenance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('interventions');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-2">
            Gestion complète des interventions et maintenance préventive
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="interventions" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Interventions
          </TabsTrigger>
          <TabsTrigger value="preventive" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Maintenance préventive
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Planning techniciens
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
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

        <TabsContent value="schedule">
          <MaintenanceSchedule />
        </TabsContent>

        <TabsContent value="history">
          <MaintenanceHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}