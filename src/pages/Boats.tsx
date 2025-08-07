import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, History, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BoatDialog } from '@/components/boats/BoatDialog';
import { BoatFilters } from '@/components/boats/BoatFilters';
import { Boat } from '@/types';

const getStatusBadge = (status: string) => {
  const statusConfig = {
    available: {
      label: 'Disponible',
      class: 'bg-green-100 text-green-800'
    },
    rented: {
      label: 'En location',
      class: 'bg-blue-100 text-blue-800'
    },
    maintenance: {
      label: 'Maintenance',
      class: 'bg-orange-100 text-orange-800'
    },
    out_of_service: {
      label: 'Hors service',
      class: 'bg-red-100 text-red-800'
    }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  return <Badge className={config.class}>{config.label}</Badge>;
};

interface BoatCardProps {
  boat: any;
  onEdit: (boat: any) => void;
  onDelete: (boatId: string, boatName: string) => void;
  onHistory: (boatId: string) => void;
  onMaintenance: (boatId: string) => void;
}

const BoatCard = ({ boat, onEdit, onDelete, onHistory, onMaintenance }: BoatCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/boats/${boat.id}`)}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{boat.name}</h3>
          <p className="text-gray-600">{boat.model} ({boat.year})</p>
          <p className="text-sm text-gray-500">HIN: {boat.hin}</p>
        </div>
        {getStatusBadge(boat.status)}
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Base: {boat.base?.name || 'Non assignée'}
        </p>
        {boat.next_maintenance && (
          <p className="text-sm text-gray-600">
            Prochaine maintenance: {new Date(boat.next_maintenance).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/boats/${boat.id}?tab=history`)}
        >
          <History className="h-4 w-4 mr-2" />
          Historique
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/boats/${boat.id}?tab=maintenance`)}
        >
          <Wrench className="h-4 w-4 mr-2" />
          Maintenance
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(boat)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Modifier
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(boat.id, boat.name)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </div>
    </Card>
  );
};

export const Boats = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: boats = [], isLoading } = useQuery({
    queryKey: ['boats', user?.role, user?.baseId],
    queryFn: async () => {
      console.log('Fetching boats for user:', { role: user?.role, baseId: user?.baseId });
      
      let query = supabase
        .from('boats')
        .select(`
          *,
          base:bases(name)
        `)
        .order('name');

      // Filter by base_id unless user is direction (can see all)
      if (user?.role !== 'direction' && user?.baseId) {
        query = query.eq('base_id', user.baseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      console.log('Boats fetched:', data?.length || 0);
      return data || [];
    },
    enabled: !!user
  });

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

  const deleteMutation = useMutation({
    mutationFn: async (boatId: string) => {
      const { error } = await supabase
        .from('boats')
        .delete()
        .eq('id', boatId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Bateau supprimé",
        description: "Le bateau a été supprimé avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bateau.",
        variant: "destructive",
      });
    }
  });

  const filteredBoats = boats?.filter(boat => {
    const matchesSearch = !searchTerm || 
      boat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boat.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boat.hin.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || boat.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleEdit = (boat: Boat) => {
    setSelectedBoat(boat);
    setIsDialogOpen(true);
  };

  const handleDelete = (boatId: string, boatName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le bateau "${boatName}" ?`)) {
      deleteMutation.mutate(boatId);
    }
  };

  const handleHistory = (boatId: string) => {
    navigate(`/boats/${boatId}?tab=history`);
  };

  const handleMaintenance = (boatId: string) => {
    navigate(`/boats/${boatId}?tab=maintenance`);
  };

  const canManageBoats = user?.role === 'direction' || user?.role === 'chef_base';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Bateaux</h1>
          <p className="text-muted-foreground">{boats?.length || 0} bateau(x) au total</p>
        </div>
        {canManageBoats && (
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau bateau
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par nom, modèle ou numéro de série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <BoatFilters
          selectedStatus={filterStatus}
          onStatusChange={setFilterStatus}
          selectedBase="all"
          onBaseChange={() => {}}
          bases={bases}
          userRole={user?.role || ''}
        />
      </div>

      {filteredBoats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Aucun bateau trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {boats?.length === 0 
                  ? "Commencez par ajouter votre premier bateau."
                  : "Aucun bateau ne correspond à vos critères de recherche."
                }
              </p>
              {canManageBoats && boats?.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un bateau
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoats.map((boat) => (
            <BoatCard
              key={boat.id}
              boat={boat}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onHistory={handleHistory}
              onMaintenance={handleMaintenance}
            />
          ))}
        </div>
      )}

      <BoatDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedBoat(null);
        }}
        boat={selectedBoat}
      />
    </div>
  );
};