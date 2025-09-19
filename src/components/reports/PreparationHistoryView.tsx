import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from '@/components/ui/date-range-picker';
import { 
  Search, 
  Ship, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  Filter
} from 'lucide-react';
import { addDays } from 'date-fns';

interface PreparationHistoryItem {
  id: string;
  status: string;
  boat_name: string;
  technician_name: string;
  created_at: string;
  completion_date: string | null;
  anomalies_count: number;
  template_name: string | null;
  duration_minutes: number | null;
}

export function PreparationHistoryView() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [boatFilter, setBoatFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // Fetch boats for filter
  const { data: boats } = useQuery({
    queryKey: ['boats-for-filter', user?.baseId],
    queryFn: async () => {
      let query = supabase.from('boats').select('id, name');
      if (user?.role !== 'direction' && user?.baseId) {
        query = query.eq('base_id', user.baseId);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user
  });

  // Fetch technicians for filter
  const { data: technicians } = useQuery({
    queryKey: ['technicians-for-filter', user?.baseId],
    queryFn: async () => {
      let query = supabase.from('profiles').select('id, name').eq('role', 'technicien');
      if (user?.role !== 'direction' && user?.baseId) {
        query = query.eq('base_id', user.baseId);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user
  });

  // Fetch preparation history
  const { data: preparationHistory, isLoading } = useQuery({
    queryKey: ['preparation-history', searchTerm, statusFilter, boatFilter, technicianFilter, dateRange, user?.baseId],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = dateRange?.to?.toISOString() || new Date().toISOString();

      // Query both planning activities and checklists
      let activitiesQuery = supabase
        .from('planning_activities')
        .select(`
          id, status, created_at, actual_start, actual_end, boat_id, technician_id,
          boats(name),
          profiles!planning_activities_technician_id_fkey(name)
        `)
        .eq('activity_type', 'preparation')
        .gte('created_at', from)
        .lte('created_at', to);

      let checklistsQuery = supabase
        .from('boat_preparation_checklists')
        .select(`
          id, status, created_at, completion_date, anomalies_count, boat_id, technician_id, template_id,
          boats(name, base_id),
          profiles!boat_preparation_checklists_technician_id_fkey(name),
          preparation_checklist_templates(name)
        `)
        .gte('created_at', from)
        .lte('created_at', to);

      // Apply base filter for non-direction users
      if (user?.role !== 'direction' && user?.baseId) {
        activitiesQuery = activitiesQuery.eq('base_id', user.baseId);
        checklistsQuery = checklistsQuery.eq('boats.base_id', user.baseId);
      }

      const [{ data: activities }, { data: checklists }] = await Promise.all([
        activitiesQuery,
        checklistsQuery
      ]);

      // Combine and transform data
      const combinedData: PreparationHistoryItem[] = [
        ...(activities || []).map((item: any) => ({
          id: item.id,
          status: item.status,
          boat_name: item.boats?.name || 'Bateau inconnu',
          technician_name: item.profiles?.name || 'Non assigné',
          created_at: item.created_at,
          completion_date: item.actual_end,
          anomalies_count: 0,
          template_name: null,
          duration_minutes: item.actual_start && item.actual_end 
            ? Math.round((new Date(item.actual_end).getTime() - new Date(item.actual_start).getTime()) / (1000 * 60))
            : null
        })),
        ...(checklists || []).map((item: any) => ({
          id: item.id,
          status: item.status,
          boat_name: item.boats?.name || 'Bateau inconnu',
          technician_name: item.profiles?.name || 'Non assigné',
          created_at: item.created_at,
          completion_date: item.completion_date,
          anomalies_count: item.anomalies_count || 0,
          template_name: item.preparation_checklist_templates?.name || null,
          duration_minutes: item.created_at && item.completion_date
            ? Math.round((new Date(item.completion_date).getTime() - new Date(item.created_at).getTime()) / (1000 * 60))
            : null
        }))
      ];

      return combinedData;
    },
    enabled: !!user
  });

  // Filter the data
  const filteredHistory = preparationHistory?.filter(item => {
    const matchesSearch = !searchTerm || 
      item.boat_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.technician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.template_name && item.template_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesBoat = boatFilter === 'all' || item.boat_name === boats?.find(b => b.id === boatFilter)?.name;
    const matchesTechnician = technicianFilter === 'all' || item.technician_name === technicians?.find(t => t.id === technicianFilter)?.name;

    return matchesSearch && matchesStatus && matchesBoat && matchesTechnician;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-success text-success-foreground">Terminée</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">En cours</Badge>;
      case 'pending':
      case 'planned':
        return <Badge variant="outline">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Historique des Préparations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par bateau, technicien, ou modèle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="completed">Terminée</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="planned">Planifiée</SelectItem>
                </SelectContent>
              </Select>

              <Select value={boatFilter} onValueChange={setBoatFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Bateau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les bateaux</SelectItem>
                  {boats?.map(boat => (
                    <SelectItem key={boat.id} value={boat.id}>{boat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Technicien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les techniciens</SelectItem>
                  {technicians?.map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Sélectionner une période"
            />
            <div className="text-sm text-muted-foreground">
              {filteredHistory.length} résultat(s) trouvé(s)
            </div>
          </div>

          {/* History List */}
          <div className="space-y-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8">
                <Ship className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune préparation trouvée</p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Ship className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{item.boat_name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.technician_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          {item.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.duration_minutes}min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.anomalies_count > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {item.anomalies_count} anomalies
                        </Badge>
                      )}
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  {item.template_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Modèle utilisé: {item.template_name}</span>
                    </div>
                  )}

                  {item.completion_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-success" />
                      <span>Terminée le {new Date(item.completion_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}