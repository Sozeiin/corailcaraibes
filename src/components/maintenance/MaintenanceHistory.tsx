import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InterventionTable } from '@/components/maintenance/InterventionTable';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { addDays } from 'date-fns';

export function MaintenanceHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBoat, setSelectedBoat] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date()
  });

  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ['interventions-history', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('interventions')
        .select(`
          *,
          boats(name, model),
          profiles(name)
        `)
        .order('completed_date', { ascending: false });

      if (dateRange.from) {
        query = query.gte('completed_date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange.to) {
        query = query.lte('completed_date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(intervention => ({
        id: intervention.id,
        boatId: intervention.boat_id || '',
        boat: intervention.boats,
        technicianId: intervention.technician_id || '',
        title: intervention.title,
        description: intervention.description || '',
        status: intervention.status || 'scheduled',
        scheduledDate: intervention.scheduled_date || '',
        completedDate: intervention.completed_date || '',
        tasks: [],
        baseId: intervention.base_id || '',
        createdAt: intervention.created_at || new Date().toISOString()
      }));
    }
  });

  const { data: boats = [] } = useQuery({
    queryKey: ['boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('id, name, model')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Filter interventions
  const filteredInterventions = interventions.filter(intervention => {
    const matchesSearch = searchTerm === '' || 
      intervention.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || intervention.status === selectedStatus;
    const matchesBoat = selectedBoat === 'all' || intervention.boatId === selectedBoat;
    
    return matchesSearch && matchesStatus && matchesBoat;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Historique des maintenances</h2>
        <p className="text-gray-600 mt-1">
          Consultation de l'historique des interventions terminées
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher une intervention..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
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

              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                placeholder="Période"
              />
            </div>
          </div>
        </div>

        <InterventionTable
          interventions={filteredInterventions}
          isLoading={isLoading}
          onEdit={() => {}} // Read-only in history
          canManage={false}
          showHistory={true}
        />
      </div>
    </div>
  );
}