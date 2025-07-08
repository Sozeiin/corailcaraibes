import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Ship, 
  Calendar, 
  MapPin,
  FileText,
  Settings,
  Edit,
  Trash2,
  History,
  Wrench
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BoatDialog } from '@/components/boats/BoatDialog';
import { BoatFilters } from '@/components/boats/BoatFilters';
import { BoatHistoryDialog } from '@/components/boats/BoatHistoryDialog';
import { BoatPreventiveMaintenanceDialog } from '@/components/boats/BoatPreventiveMaintenanceDialog';
import { Boat } from '@/types';

const getStatusBadge = (status: string) => {
  const statusConfig = {
    available: { label: 'Disponible', class: 'bg-green-100 text-green-800' },
    rented: { label: 'En location', class: 'bg-blue-100 text-blue-800' },
    maintenance: { label: 'Maintenance', class: 'bg-orange-100 text-orange-800' },
    out_of_service: { label: 'Hors service', class: 'bg-red-100 text-red-800' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  return <Badge className={config.class}>{config.label}</Badge>;
};

interface BoatCardProps {
  boat: Boat & { baseName?: string };
  onEdit: (boat: Boat) => void;
  onDelete: (boat: Boat) => void;
  onHistory: (boat: Boat) => void;
  onPreventiveMaintenance: (boat: Boat) => void;
  canManage: boolean;
}

const BoatCard = ({ boat, onEdit, onDelete, onHistory, onPreventiveMaintenance, canManage }: BoatCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-2 sm:pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Ship className="h-4 w-4 sm:h-5 sm:w-5 text-marine-600" />
          <span className="truncate">{boat.name}</span>
        </CardTitle>
        {getStatusBadge(boat.status)}
      </div>
      <p className="text-xs sm:text-sm text-gray-600">{boat.model} • {boat.year}</p>
    </CardHeader>
    <CardContent className="space-y-3 sm:space-y-4">
      <div className="space-y-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{boat.baseName || 'Base inconnue'}</span>
        </div>
        {boat.nextMaintenance && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs">Maintenance: {new Date(boat.nextMaintenance).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
          <span>{boat.documents?.length || 0} document(s)</span>
        </div>
        <div className="text-xs text-gray-500 truncate">
          N° série: {boat.serialNumber}
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => onHistory(boat)}
          >
            <History className="h-3 w-3 mr-1" />
            <span className="hidden xs:inline">Historique</span>
            <span className="xs:hidden">Hist.</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => onPreventiveMaintenance(boat)}
          >
            <Wrench className="h-3 w-3 mr-1" />
            <span className="hidden xs:inline">Maintenance</span>
            <span className="xs:hidden">Maint.</span>
          </Button>
        </div>
        {canManage && (
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs"
              onClick={() => onEdit(boat)}
            >
              <Edit className="h-3 w-3 mr-1" />
              <span className="hidden xs:inline">Modifier</span>
              <span className="xs:hidden">Edit</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs text-red-600 hover:text-red-700"
              onClick={() => onDelete(boat)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              <span className="hidden xs:inline">Supprimer</span>
              <span className="xs:hidden">Supp.</span>
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function Boats() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBase, setSelectedBase] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyBoat, setHistoryBoat] = useState<Boat | null>(null);
  const [isPreventiveMaintenanceDialogOpen, setIsPreventiveMaintenanceDialogOpen] = useState(false);
  const [preventiveMaintenanceBoat, setPreventiveMaintenanceBoat] = useState<Boat | null>(null);

  // Fetch boats data
  const { data: boats = [], isLoading } = useQuery({
    queryKey: ['boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select(`
          *,
          bases(name)
        `)
        .order('name');

      if (error) throw error;

      return data.map(boat => ({
        id: boat.id,
        name: boat.name,
        model: boat.model,
        serialNumber: boat.serial_number,
        year: boat.year,
        status: boat.status,
        baseId: boat.base_id,
        documents: boat.documents || [],
        nextMaintenance: boat.next_maintenance,
        createdAt: boat.created_at,
        updatedAt: boat.updated_at,
        baseName: boat.bases?.name
      })) as (Boat & { baseName?: string })[];
    }
  });

  // Fetch bases for filters
  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Filter boats based on search, status, and base
  const filteredBoats = boats.filter(boat => {
    const matchesSearch = searchTerm === '' || 
      boat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boat.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boat.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || boat.status === selectedStatus;
    const matchesBase = selectedBase === 'all' || boat.baseId === selectedBase;
    
    return matchesSearch && matchesStatus && matchesBase;
  });

  // Calculate stats
  const stats = {
    available: boats.filter(b => b.status === 'available').length,
    rented: boats.filter(b => b.status === 'rented').length,
    maintenance: boats.filter(b => b.status === 'maintenance').length,
    out_of_service: boats.filter(b => b.status === 'out_of_service').length,
  };

  const handleEdit = (boat: Boat) => {
    setEditingBoat(boat);
    setIsDialogOpen(true);
  };

  const handleDelete = async (boat: Boat) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le bateau "${boat.name}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('boats')
        .delete()
        .eq('id', boat.id);

      if (error) throw error;

      toast({
        title: 'Bateau supprimé',
        description: `${boat.name} a été supprimé de la flotte.`,
      });

      queryClient.invalidateQueries({ queryKey: ['boats'] });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le bateau.',
        variant: 'destructive',
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingBoat(null);
  };

  const handleHistory = (boat: Boat) => {
    setHistoryBoat(boat);
    setIsHistoryDialogOpen(true);
  };

  const handleHistoryDialogClose = () => {
    setIsHistoryDialogOpen(false);
    setHistoryBoat(null);
  };

  const handlePreventiveMaintenance = (boat: Boat) => {
    setPreventiveMaintenanceBoat(boat);
    setIsPreventiveMaintenanceDialogOpen(true);
  };

  const handlePreventiveMaintenanceDialogClose = () => {
    setIsPreventiveMaintenanceDialogOpen(false);
    setPreventiveMaintenanceBoat(null);
  };

  const canManageBoats = user?.role === 'direction' || user?.role === 'chef_base';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Bateaux</h1>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Bateaux</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Gérez votre flotte de catamarans • {filteredBoats.length} bateau(x) affiché(s)
          </p>
        </div>
        {canManageBoats && (
          <Button onClick={() => setIsDialogOpen(true)} className="bg-marine-600 hover:bg-marine-700 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Nouveau bateau</span>
            <span className="xs:hidden">Nouveau</span>
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par nom, modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </div>

          <BoatFilters
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedBase={selectedBase}
            onBaseChange={setSelectedBase}
            bases={bases}
            userRole={user?.role || ''}
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.available}</div>
            <div className="text-xs sm:text-sm text-gray-600">Disponibles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.rented}</div>
            <div className="text-xs sm:text-sm text-gray-600">En location</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.maintenance}</div>
            <div className="text-xs sm:text-sm text-gray-600">En maintenance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.out_of_service}</div>
            <div className="text-xs sm:text-sm text-gray-600">Hors service</div>
          </CardContent>
        </Card>
      </div>

      {/* Boats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredBoats.map((boat) => (
          <BoatCard 
            key={boat.id} 
            boat={boat} 
            onEdit={handleEdit}
            onDelete={handleDelete}
            onHistory={handleHistory}
            onPreventiveMaintenance={handlePreventiveMaintenance}
            canManage={canManageBoats}
          />
        ))}
      </div>

      {filteredBoats.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Ship className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {boats.length === 0 ? 'Aucun bateau dans cette base' : 'Aucun bateau trouvé'}
            </h3>
            <p className="text-gray-600">
              {boats.length === 0 
                ? 'Commencez par ajouter vos premiers bateaux à la flotte.' 
                : 'Essayez de modifier vos critères de recherche ou filtres.'
              }
            </p>
            {canManageBoats && boats.length === 0 && (
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                className="mt-4 bg-marine-600 hover:bg-marine-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le premier bateau
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <BoatDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        boat={editingBoat}
      />

      <BoatHistoryDialog
        isOpen={isHistoryDialogOpen}
        onClose={handleHistoryDialogClose}
        boat={historyBoat}
      />

      <BoatPreventiveMaintenanceDialog
        isOpen={isPreventiveMaintenanceDialogOpen}
        onClose={handlePreventiveMaintenanceDialogClose}
        boat={preventiveMaintenanceBoat}
      />
    </div>
  );
}