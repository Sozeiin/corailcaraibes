import React, { useState } from 'react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, History, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BoatDialog } from '@/components/boats/BoatDialog';
import { BoatFilters } from '@/components/boats/BoatFilters';
import { SharedBoatsIndicator } from '@/components/boats/SharedBoatsIndicator';
import { Boat } from '@/types';
import { useDeleteBoat } from '@/hooks/useBoatMutations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  isShared?: boolean;
  ownerBaseName?: string;
}

const BoatCard = ({
  boat,
  onEdit,
  onDelete,
  onHistory,
  onMaintenance,
  isShared,
  ownerBaseName
}: BoatCardProps) => {
  const navigate = useNavigate();
  return <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/boats/${boat.id}`)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">{boat.name}</h3>
            {isShared && ownerBaseName && (
              <SharedBoatsIndicator ownerBaseName={ownerBaseName} variant="compact" />
            )}
          </div>
          <p className="text-gray-600">{boat.model} ({boat.year})</p>
          <p className="text-sm text-gray-500">N° de série: {boat.serial_number}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {getStatusBadge(boat.status)}
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Base: {boat.base?.name || 'Non assignée'}
        </p>
        {boat.next_maintenance && <p className="text-sm text-gray-600">
            Prochaine maintenance: {new Date(boat.next_maintenance).toLocaleDateString()}
          </p>}
      </div>

      <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="outline" onClick={() => onEdit(boat)}>
          <Edit className="h-4 w-4 mr-2" />
          Modifier
        </Button>
        <Button size="sm" variant="outline" onClick={() => onHistory(boat.id)}>
          <History className="h-4 w-4 mr-2" />
          Historique
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/boats/${boat.id}/safety-controls`)}>
          <Shield className="h-4 w-4 mr-2" />
          Contrôles
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(boat.id, boat.name)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </div>
    </Card>;
};

export const Boats = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBase, setFilterBase] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [boatToDelete, setBoatToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;
  const deleteBoatMutation = useDeleteBoat();

  const {
    data: rawBoats = [],
    loading: isLoading,
    refetch: refetchBoats
  } = useOfflineData<any>({ table: 'boats', baseId, dependencies: [user?.role, user?.baseId] });
  
  // Fonction de rafraîchissement manuel
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    console.log('🔄 [Boats] Manual refresh triggered');
    try {
      await refetchBoats();
      toast({
        title: "Données actualisées",
        description: `${rawBoats.length} bateau(x) chargé(s)`,
      });
    } catch (error) {
      console.error('Error during manual refresh:', error);
      toast({
        title: "Erreur de rafraîchissement",
        description: "Impossible d'actualiser les données. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const { data: bases = [] } = useOfflineData<any>({ table: 'bases' });

  // Fetch shared boats (ONE WAY)
  const { data: sharedBoats = [] } = useQuery({
    queryKey: ['shared-boats', user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];
      
      const { data, error } = await supabase
        .from('boat_sharing')
        .select(`
          *,
          boat:boats(*),
          owner_base:bases!boat_sharing_owner_base_id_fkey(*)
        `)
        .eq('shared_with_base_id', user.baseId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId && user?.role !== 'direction',
  });

  // Combine owned boats + shared boats
  const ownedBoats = rawBoats.map((boat: any) => ({
    ...boat,
    base: bases.find((b: any) => b.id === boat.base_id),
    isShared: false
  }));

  const sharedBoatsWithBase = sharedBoats.map((sharing: any) => ({
    ...sharing.boat,
    base: bases.find((b: any) => b.id === sharing.boat.base_id),
    isShared: true,
    ownerBaseName: sharing.owner_base?.name
  }));

  const boats = [...ownedBoats, ...sharedBoatsWithBase];

  const filteredBoats = boats?.filter(boat => {
    const matchesSearch = !searchTerm || 
      boat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      boat.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
      boat.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || boat.status === filterStatus;
    
    const matchesBase = filterBase === 'all' || boat.base_id === filterBase;
    
    return matchesSearch && matchesStatus && matchesBase;
  }) || [];

  const handleEdit = (boat: any) => {
    setSelectedBoat({
      id: boat.id,
      name: boat.name,
      model: boat.model,
      serialNumber: boat.serial_number,
      year: boat.year,
      status: boat.status,
      baseId: boat.base_id,
      documents: boat.documents || [],
      nextMaintenance: boat.next_maintenance || '',
      createdAt: boat.created_at,
      updatedAt: boat.updated_at
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (boatId: string, boatName: string) => {
    setBoatToDelete({ id: boatId, name: boatName });
  };

  const confirmDelete = async () => {
    if (!boatToDelete) return;

    try {
      await deleteBoatMutation.mutateAsync(boatToDelete.id);
      refetchBoats();
      setBoatToDelete(null);
    } catch (error) {
      console.error('Error deleting boat:', error);
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
    return <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }

  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bateaux</h1>
          <p className="text-muted-foreground">{boats?.length || 0} bateau(x) au total</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualisation...' : 'Rafraîchir'}
          </Button>
          {canManageBoats && <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau bateau
            </Button>}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 my-0 py-px">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input placeholder="Rechercher par nom, modèle ou numéro de série..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <BoatFilters 
          selectedStatus={filterStatus} 
          onStatusChange={setFilterStatus} 
          selectedBase={filterBase} 
          onBaseChange={setFilterBase} 
          bases={bases} 
          userRole={user?.role || ''} 
        />
      </div>

      {filteredBoats.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Aucun bateau trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {boats?.length === 0 ? "Commencez par ajouter votre premier bateau." : "Aucun bateau ne correspond à vos critères de recherche."}
              </p>
              {canManageBoats && boats?.length === 0 && <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un bateau
                </Button>}
            </div>
          </CardContent>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoats.map(boat => (
            <BoatCard 
              key={boat.id} 
              boat={boat} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
              onHistory={handleHistory} 
              onMaintenance={handleMaintenance}
              isShared={boat.isShared}
              ownerBaseName={boat.ownerBaseName}
            />
          ))}
        </div>}

      <BoatDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedBoat(null);
          refetchBoats();
        }} 
        boat={selectedBoat} 
      />

      <AlertDialog open={!!boatToDelete} onOpenChange={(open) => !open && setBoatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Êtes-vous sûr de vouloir supprimer le bateau <strong>"{boatToDelete?.name}"</strong> ?
              </p>
              <p className="text-destructive font-medium">
                ⚠️ Cette action est irréversible et supprimera également :
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Tous les composants et sous-composants</li>
                <li>Tous les contrôles de sécurité</li>
                <li>Toutes les checklists et préparations</li>
                <li>Toutes les interventions et maintenances</li>
                <li>Tous les documents et locations</li>
                <li>Toutes les données liées à ce bateau</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBoatMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteBoatMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteBoatMutation.isPending ? 'Suppression...' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
