import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualMaintenanceTable } from '@/components/maintenance/ManualMaintenanceTable';
import { ScheduledMaintenanceTable } from '@/components/maintenance/ScheduledMaintenanceTable';
import { MaintenanceManualDialog } from '@/components/maintenance/MaintenanceManualDialog';

export function PreventiveMaintenance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manuals');

  const { data: maintenanceManuals = [], isLoading: manualsLoading } = useQuery({
    queryKey: ['maintenance-manuals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_manuals')
        .select(`
          *,
          boats(name, model),
          maintenance_manual_tasks(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(manual => ({
        id: manual.id,
        boatId: manual.boat_id,
        boatName: manual.boats?.name || 'Non spécifié',
        boatModel: manual.boat_model,
        manufacturer: manual.manufacturer,
        tasks: manual.maintenance_manual_tasks?.map(task => ({
          id: task.id,
          name: task.task_name,
          interval: task.interval_value,
          unit: task.interval_unit,
          description: task.description
        })) || [],
        createdAt: manual.created_at
      }));
    }
  });

  const { data: scheduledMaintenance = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['scheduled-maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_maintenance')
        .select(`
          *,
          boats(name, model),
          maintenance_manual_tasks(task_name, interval_value, interval_unit)
        `)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      return data.map(schedule => ({
        id: schedule.id,
        boatId: schedule.boat_id,
        boatName: schedule.boats?.name || 'Bateau inconnu',
        taskName: schedule.task_name,
        scheduledDate: schedule.scheduled_date,
        status: schedule.status,
        intervalValue: schedule.maintenance_manual_tasks?.interval_value,
        intervalUnit: schedule.maintenance_manual_tasks?.interval_unit
      }));
    }
  });

  const canManage = user?.role === 'direction' || user?.role === 'chef_base';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Maintenance préventive</h2>
          <p className="text-gray-600 mt-1">
            Gestion des manuels constructeur et planning automatique
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manuals" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Manuels constructeur
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Maintenances programmées
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manuals">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher un manuel..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {canManage && (
                  <Button
                    onClick={() => setIsManualDialogOpen(true)}
                    className="bg-marine-600 hover:bg-marine-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un manuel
                  </Button>
                )}
              </div>
            </div>

            <ManualMaintenanceTable
              manuals={maintenanceManuals}
              isLoading={manualsLoading}
              canManage={canManage}
            />
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Maintenances programmées automatiquement
              </h3>
              <p className="text-gray-600 mt-1">
                Basées sur les manuels constructeur et les heures de fonctionnement
              </p>
            </div>

            <ScheduledMaintenanceTable
              maintenances={scheduledMaintenance}
              isLoading={scheduleLoading}
              canManage={canManage}
            />
          </div>
        </TabsContent>
      </Tabs>

      <MaintenanceManualDialog
        isOpen={isManualDialogOpen}
        onClose={() => {
          setIsManualDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['maintenance-manuals'] });
          queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance'] });
        }}
      />
    </div>
  );
}