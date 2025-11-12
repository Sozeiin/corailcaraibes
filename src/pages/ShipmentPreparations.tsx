import React, { useState } from 'react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Package, Plus, Search } from 'lucide-react';
import { PreparationDialog } from '@/components/shipments/PreparationDialog';
import { PreparationDetailsDialog } from '@/components/shipments/PreparationDetailsDialog';

interface ShipmentPreparation {
  id: string;
  reference: string;
  name: string;
  source_base_id: string;
  destination_base_id: string;
  status: 'draft' | 'in_progress' | 'closed' | 'shipped' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
  total_boxes: number;
  total_items: number;
  notes?: string;
  source_base?: { name: string };
  destination_base?: { name: string };
}

const statusLabels = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  closed: 'Clôturée',
  shipped: 'Expédiée',
  completed: 'Terminée'
};

const statusColors = {
  draft: 'secondary',
  in_progress: 'default',
  closed: 'secondary',
  shipped: 'default',
  completed: 'default'
} as const;

export default function ShipmentPreparations() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPendingReceptions, setShowPendingReceptions] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPreparation, setSelectedPreparation] = useState<ShipmentPreparation | null>(null);

  // Récupérer les préparations
  const { data: preparations = [], refetch } = useOfflineData<ShipmentPreparation>({
    table: 'shipment_preparations',
    dependencies: [user?.id]
  });

  // Récupérer les bases
  const { data: bases = [] } = useOfflineData<any>({
    table: 'bases',
    dependencies: [user?.role]
  });

  // Créer une map des bases pour l'affichage
  const basesMap = bases.reduce((acc: any, base: any) => {
    acc[base.id] = base;
    return acc;
  }, {});

  // Compter les expéditions à recevoir
  const pendingReceptionsCount = preparations.filter(
    (prep) => prep.status === 'shipped' && prep.destination_base_id === user?.baseId
  ).length;

  // Filtrer les préparations
  const filteredPreparations = preparations.filter((prep) => {
    const matchesSearch = prep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prep.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prep.status === statusFilter;
    const matchesReception = !showPendingReceptions || (prep.status === 'shipped' && prep.destination_base_id === user?.baseId);
    return matchesSearch && matchesStatus && matchesReception;
  });

  const handlePreparationCreated = () => {
    setIsCreateDialogOpen(false);
    refetch();
  };

  const handleViewPreparation = (preparation: ShipmentPreparation) => {
    setSelectedPreparation(preparation);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Préparations d'expéditions</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Gérez vos expéditions entre bases
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showPendingReceptions ? 'default' : 'outline'}
            onClick={() => setShowPendingReceptions(!showPendingReceptions)}
            className="sm:w-auto relative"
          >
            <Package className="h-4 w-4 mr-2" />
            À recevoir
            {pendingReceptionsCount > 0 && (
              <Badge className="ml-2 px-1.5 py-0.5 text-xs" variant="destructive">
                {pendingReceptionsCount}
              </Badge>
            )}
          </Button>
          <Button 
            variant="secondary"
            onClick={() => window.location.href = '/scanner?mode=reception'}
            className="sm:w-auto"
          >
            <Package className="h-4 w-4 mr-2" />
            Scanner une réception
          </Button>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle préparation
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher par nom ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Liste des préparations */}
      <div className="grid gap-4">
        {filteredPreparations.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Aucune préparation trouvée
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Aucune préparation ne correspond à vos critères de recherche.'
                : 'Créez votre première préparation d\'expédition.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle préparation
              </Button>
            )}
          </Card>
        ) : (
          filteredPreparations.map((preparation) => (
            <Card 
              key={preparation.id} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewPreparation(preparation)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-foreground truncate">
                      {preparation.name}
                    </h3>
                    <Badge variant={statusColors[preparation.status]}>
                      {statusLabels[preparation.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">{preparation.reference}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>
                      {basesMap[preparation.source_base_id]?.name || 'Base source'} → {basesMap[preparation.destination_base_id]?.name || 'Base destination'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{preparation.total_boxes} carton{preparation.total_boxes > 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{preparation.total_items} article{preparation.total_items > 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-1">
                    {new Date(preparation.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      <PreparationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handlePreparationCreated}
        bases={bases}
      />

      {selectedPreparation && (
        <PreparationDetailsDialog
          preparation={selectedPreparation}
          bases={basesMap}
          open={!!selectedPreparation}
          onOpenChange={(open) => !open && setSelectedPreparation(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}