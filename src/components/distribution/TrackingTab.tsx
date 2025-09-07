import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, Truck, ExternalLink, Download } from 'lucide-react';
import { ItemsList } from '@/components/distribution/ItemsList';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Shipment {
  id: string;
  status: string;
  source_base_id: string;
  destination_base_id: string;
  carrier?: string;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Base {
  id: string;
  name: string;
  location: string;
}

const STATUS_LABELS = {
  draft: 'Brouillon',
  packed: 'Emballé',
  shipped: 'Expédié',
  received: 'Reçu',
  received_with_discrepancy: 'Reçu avec écarts',
  reconciled: 'Réconcilié'
};

const STATUS_COLORS = {
  draft: 'secondary',
  packed: 'outline',
  shipped: 'default',
  received: 'default',
  received_with_discrepancy: 'destructive',
  reconciled: 'default'
} as const;

export function TrackingTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Fetch bases
  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('id, name, location');
      
      if (error) throw error;
      return data as Base[];
    }
  });

  // Fetch shipments
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shipment[];
    }
  });

  // Fetch shipment details with items and packages
  const { data: shipmentDetails } = useQuery({
    queryKey: ['shipment-details', selectedShipment?.id],
    queryFn: async () => {
      if (!selectedShipment?.id) return null;

      const [itemsResult, packagesResult] = await Promise.all([
        supabase
          .from('shipment_items')
          .select('*')
          .eq('shipment_id', selectedShipment.id),
        supabase
          .from('shipment_packages')
          .select('*')
          .eq('shipment_id', selectedShipment.id)
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (packagesResult.error) throw packagesResult.error;

      return {
        items: itemsResult.data,
        packages: packagesResult.data
      };
    },
    enabled: !!selectedShipment?.id
  });

  const filteredShipments = shipments.filter(shipment => {
    if (!searchTerm) return true;
    
    const sourceBase = bases.find(b => b.id === shipment.source_base_id);
    const destBase = bases.find(b => b.id === shipment.destination_base_id);
    
    return (
      sourceBase?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      destBase?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.carrier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getBaseName = (baseId: string) => {
    const base = bases.find(b => b.id === baseId);
    return base ? `${base.name} (${base.location})` : 'Base inconnue';
  };

  const getTrackingUrl = (carrier?: string, trackingNumber?: string) => {
    if (!carrier || !trackingNumber) return null;
    
    switch (carrier.toLowerCase()) {
      case 'chronopost':
        return `https://www.chronopost.fr/tracking-colis?listeNumerosLT=${trackingNumber}`;
      case 'colissimo':
        return `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`;
      case 'dhl':
        return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${trackingNumber}`;
      case 'ups':
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
      case 'fedex':
        return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
      default:
        return null;
    }
  };

  const handlePrintLabel = (shipmentId: string, packageCode: string) => {
    // TODO: Implement PDF generation
    console.log('Impression étiquette:', { shipmentId, packageCode });
  };

  if (selectedShipment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedShipment(null)}>
            ← Retour à la liste
          </Button>
          <div>
            <h3 className="text-lg font-semibold">Détail de l'expédition</h3>
            <p className="text-sm text-muted-foreground">
              {getBaseName(selectedShipment.source_base_id)} → {getBaseName(selectedShipment.destination_base_id)}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Informations générales</span>
              <Badge variant={STATUS_COLORS[selectedShipment.status as keyof typeof STATUS_COLORS]}>
                {STATUS_LABELS[selectedShipment.status as keyof typeof STATUS_LABELS]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Transporteur</p>
              <p className="font-medium">{selectedShipment.carrier || 'Non défini'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Numéro de suivi</p>
              <div className="flex items-center gap-2">
                <p className="font-medium">{selectedShipment.tracking_number || 'Non défini'}</p>
                {selectedShipment.tracking_number && getTrackingUrl(selectedShipment.carrier, selectedShipment.tracking_number) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getTrackingUrl(selectedShipment.carrier, selectedShipment.tracking_number), '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Créé le</p>
              <p className="font-medium">
                {format(new Date(selectedShipment.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mis à jour le</p>
              <p className="font-medium">
                {format(new Date(selectedShipment.updated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
            {selectedShipment.notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{selectedShipment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {shipmentDetails?.packages && shipmentDetails.packages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Colis expédiés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipmentDetails.packages.map((pkg) => (
                  <div key={pkg.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Colis {pkg.package_code}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintLabel(selectedShipment.id, pkg.package_code)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Étiquette
                      </Button>
                    </div>
                    <ItemsList
                      items={shipmentDetails.items?.filter(item => item.package_id === pkg.id) || []}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher par base, transporteur ou numéro de suivi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des expéditions */}
      {isLoading ? (
        <div className="text-center py-8">
          <p>Chargement des expéditions...</p>
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucune expédition trouvée</p>
          <p className="text-sm mt-1">Créez votre première expédition dans l'onglet "Préparer & scanner"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredShipments.map((shipment) => (
            <Card key={shipment.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4" onClick={() => setSelectedShipment(shipment)}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <Badge variant={STATUS_COLORS[shipment.status as keyof typeof STATUS_COLORS]}>
                      {STATUS_LABELS[shipment.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(shipment.created_at), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">
                    {getBaseName(shipment.source_base_id)} → {getBaseName(shipment.destination_base_id)}
                  </p>
                  
                  {shipment.carrier && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Transporteur:</span> {shipment.carrier}
                    </p>
                  )}
                  
                  {shipment.tracking_number && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Suivi:</span> {shipment.tracking_number}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}