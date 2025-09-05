import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScanInput } from '@/components/distribution/ScanInput';
import { ItemsList } from '@/components/distribution/ItemsList';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Plus, Send, QrCode } from 'lucide-react';

interface ShipmentFormData {
  sourceBaseId: string;
  destinationBaseId: string;
  carrier: string;
  trackingNumber: string;
  notes: string;
}

interface ShipmentItem {
  id: string;
  sku: string;
  product_label: string;
  qty: number;
  package_id?: string;
}

interface Shipment {
  id: string;
  status: string;
  source_base_id: string;
  destination_base_id: string;
  carrier?: string;
  tracking_number?: string;
  notes?: string;
  items?: ShipmentItem[];
}

const CARRIERS = [
  'Chronopost',
  'Colissimo', 
  'DHL',
  'UPS',
  'FedEx',
  'La Poste',
  'Autre'
];

export function PreparationTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);
  const [formData, setFormData] = useState<ShipmentFormData>({
    sourceBaseId: user?.baseId || '',
    destinationBaseId: '',
    carrier: '',
    trackingNumber: '',
    notes: ''
  });
  const [packageCode, setPackageCode] = useState('');
  const [showPackageInput, setShowPackageInput] = useState(false);

  // Fetch bases for selection
  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('id, name, location');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch current shipment items
  const { data: shipmentItems = [], refetch: refetchItems } = useQuery({
    queryKey: ['shipment-items', currentShipment?.id],
    queryFn: async () => {
      if (!currentShipment?.id) return [];
      
      const { data, error } = await supabase
        .from('shipment_items')
        .select('*')
        .eq('shipment_id', currentShipment.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentShipment?.id
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (data: ShipmentFormData) => {
      const { data: result, error } = await supabase.rpc('create_shipment', {
        p_source_base_id: data.sourceBaseId,
        p_destination_base_id: data.destinationBaseId,
        p_carrier: data.carrier || null,
        p_tracking_number: data.trackingNumber || null,
        p_notes: data.notes || null
      });
      
      if (error) throw error;
      return result;
    },
    onSuccess: async (shipmentId) => {
      const { data: shipment } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single();
      
      setCurrentShipment(shipment);
      toast({
        title: 'Expédition créée',
        description: 'L\'expédition est prête pour le scan des articles.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Add item by scan mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ sku, qty, packageCode }: { sku: string; qty: number; packageCode?: string }) => {
      if (!currentShipment?.id) throw new Error('Aucune expédition active');
      
      const { data, error } = await supabase.rpc('add_item_by_scan', {
        p_shipment_id: currentShipment.id,
        p_sku: sku,
        p_qty: qty,
        p_package_code: packageCode || null
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchItems();
      toast({
        title: 'Article ajouté',
        description: 'L\'article a été ajouté à l\'expédition.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Pack shipment mutation
  const packShipmentMutation = useMutation({
    mutationFn: async () => {
      if (!currentShipment?.id) throw new Error('Aucune expédition active');
      
      const { error } = await supabase.rpc('pack_shipment', {
        p_shipment_id: currentShipment.id
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setCurrentShipment(prev => prev ? { ...prev, status: 'packed' } : null);
      toast({
        title: 'Colis fermé',
        description: 'Le colis est prêt pour l\'expédition.'
      });
    }
  });

  // Ship mutation
  const shipMutation = useMutation({
    mutationFn: async () => {
      if (!currentShipment?.id) throw new Error('Aucune expédition active');
      
      const { error } = await supabase.rpc('mark_shipped', {
        p_shipment_id: currentShipment.id
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setCurrentShipment(null);
      setFormData({
        sourceBaseId: user?.baseId || '',
        destinationBaseId: '',
        carrier: '',
        trackingNumber: '',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast({
        title: 'Expédition envoyée',
        description: 'L\'expédition a été marquée comme envoyée. Les articles ont été sortis du stock.'
      });
    }
  });

  const handleCreateShipment = () => {
    if (!formData.sourceBaseId || !formData.destinationBaseId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner les bases source et destination.',
        variant: 'destructive'
      });
      return;
    }

    createShipmentMutation.mutate(formData);
  };

  const handleScan = (sku: string) => {
    addItemMutation.mutate({ sku, qty: 1, packageCode: packageCode || undefined });
  };

  const handlePackageCodeSubmit = () => {
    if (!packageCode.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un code de colis.',
        variant: 'destructive'
      });
      return;
    }
    
    packShipmentMutation.mutate();
    setShowPackageInput(false);
  };

  const canShip = currentShipment?.status === 'packed' && 
                  currentShipment.carrier && 
                  currentShipment.tracking_number;

  return (
    <div className="space-y-6">
      {!currentShipment ? (
        // Création d'expédition
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Créer une nouvelle expédition</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sourceBase">Base source</Label>
              <Select
                value={formData.sourceBaseId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sourceBaseId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la base source" />
                </SelectTrigger>
                <SelectContent>
                  {bases.map((base) => (
                    <SelectItem key={base.id} value={base.id}>
                      {base.name} ({base.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationBase">Base destination</Label>
              <Select
                value={formData.destinationBaseId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, destinationBaseId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la base destination" />
                </SelectTrigger>
                <SelectContent>
                  {bases.filter(b => b.id !== formData.sourceBaseId).map((base) => (
                    <SelectItem key={base.id} value={base.id}>
                      {base.name} ({base.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier">Transporteur</Label>
              <Select
                value={formData.carrier}
                onValueChange={(value) => setFormData(prev => ({ ...prev, carrier: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le transporteur" />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((carrier) => (
                    <SelectItem key={carrier} value={carrier}>
                      {carrier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Numéro de suivi</Label>
              <Input
                id="trackingNumber"
                value={formData.trackingNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                placeholder="Numéro de suivi (optionnel)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Commentaire</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Commentaire optionnel"
              rows={3}
            />
          </div>

          <Button 
            onClick={handleCreateShipment}
            disabled={createShipmentMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer l'expédition
          </Button>
        </div>
      ) : (
        // Scan et gestion des articles
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Expédition en cours
                <Badge variant={currentShipment.status === 'draft' ? 'secondary' : 'default'}>
                  {currentShipment.status === 'draft' ? 'Brouillon' : 
                   currentShipment.status === 'packed' ? 'Emballé' : currentShipment.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {bases.find(b => b.id === currentShipment.source_base_id)?.name} → {' '}
                    {bases.find(b => b.id === currentShipment.destination_base_id)?.name}
                  </p>
                  {currentShipment.carrier && (
                    <p className="text-sm">Transporteur: {currentShipment.carrier}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {currentShipment.status === 'draft' && (
            <>
              <ScanInput onScan={handleScan} disabled={addItemMutation.isPending} />
              
              <ItemsList 
                items={shipmentItems}
                onQuantityChange={(itemId, newQty) => {
                  // TODO: Implement quantity update
                }}
                showPackageCode
              />

              <Separator />

              <div className="flex flex-col sm:flex-row gap-4">
                {!showPackageInput ? (
                  <Button
                    onClick={() => setShowPackageInput(true)}
                    disabled={shipmentItems.length === 0}
                    variant="outline"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Fermer le colis
                  </Button>
                ) : (
                  <div className="flex gap-2 flex-1">
                    <Input
                      value={packageCode}
                      onChange={(e) => setPackageCode(e.target.value)}
                      placeholder="Code du colis (ex: G27)"
                      className="flex-1"
                    />
                    <Button onClick={handlePackageCodeSubmit} disabled={packShipmentMutation.isPending}>
                      Valider
                    </Button>
                    <Button variant="outline" onClick={() => setShowPackageInput(false)}>
                      Annuler
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {currentShipment.status === 'packed' && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✅ Colis fermé et prêt pour l'expédition
                </p>
                <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                  {shipmentItems.length} article(s) dans ce colis
                </p>
              </div>

              <Button
                onClick={() => shipMutation.mutate()}
                disabled={!canShip || shipMutation.isPending}
                className="w-full sm:w-auto"
                size="lg"
              >
                <Send className="w-4 h-4 mr-2" />
                Expédier
              </Button>

              {!canShip && (
                <p className="text-sm text-muted-foreground">
                  Le transporteur et le numéro de suivi sont requis pour expédier.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}