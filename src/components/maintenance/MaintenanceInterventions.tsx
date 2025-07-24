import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InterventionCards } from '@/components/maintenance/InterventionCards';
import { InterventionDialog } from '@/components/maintenance/InterventionDialog';
import { Intervention } from '@/types';

export function MaintenanceInterventions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBoat, setSelectedBoat] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);

  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ['interventions', user?.role, user?.baseId],
    queryFn: async () => {
      console.log('Fetching interventions for user:', { role: user?.role, baseId: user?.baseId });
      
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          boats(name, model),
          profiles(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching interventions:', error);
        throw error;
      }

      console.log('Fetched interventions:', data?.length || 0);
      return data.map(intervention => ({
        id: intervention.id,
        boatId: intervention.boat_id || '',
        technicianId: intervention.technician_id || '',
        title: intervention.title,
        description: intervention.description || '',
        status: intervention.status || 'scheduled',
        scheduledDate: intervention.scheduled_date || '',
        completedDate: intervention.completed_date || '',
        tasks: [], // Will be loaded separately
        baseId: intervention.base_id || '',
        createdAt: intervention.created_at || new Date().toISOString(),
        boat: intervention.boats ? {
          name: intervention.boats.name,
          model: intervention.boats.model
        } : undefined
      })) as Intervention[];
    },
    enabled: !!user
  });

  const { data: boats = [] } = useQuery({
    queryKey: ['boats', user?.role, user?.baseId],
    queryFn: async () => {
      console.log('Fetching boats for user:', { role: user?.role, baseId: user?.baseId });
      
      const { data, error } = await supabase
        .from('boats')
        .select('id, name, model')
        .order('name');

      if (error) {
        console.error('Error fetching boats:', error);
        throw error;
      }
      
      console.log('Fetched boats:', data?.length || 0);
      return data;
    },
    enabled: !!user
  });

  // Filter interventions
  const filteredInterventions = interventions.filter(intervention => {
    const matchesSearch = searchTerm === '' || 
      intervention.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || intervention.status === selectedStatus;
    const matchesBoat = selectedBoat === 'all' || intervention.boatId === selectedBoat;
    
    return matchesSearch && matchesStatus && matchesBoat;
  });

  const handleEdit = (intervention: Intervention) => {
    setEditingIntervention(intervention);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingIntervention(null);
    queryClient.invalidateQueries({ queryKey: ['interventions'] });
  };

  const canManage = user?.role === 'direction' || user?.role === 'chef_base';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interventions en cours</h2>
          <p className="text-gray-600 mt-1">
            Gestion des interventions de maintenance
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-marine-600 hover:bg-marine-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle intervention
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher une intervention..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="scheduled">Programmée</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="completed">Terminée</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedBoat} onValueChange={setSelectedBoat}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tous les bateaux" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les bateaux</SelectItem>
                {boats.map((boat) => (
                  <SelectItem key={boat.id} value={boat.id}>
                    {boat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6">
          <InterventionCards
            interventions={filteredInterventions}
            isLoading={isLoading}
            onEdit={handleEdit}
            canManage={canManage}
          />
        </div>
      </div>

      <InterventionDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        intervention={editingIntervention}
      />
    </div>
  );
}