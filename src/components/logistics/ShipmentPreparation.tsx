import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Package, 
  Plus, 
  Send, 
  Eye,
  Truck,
  QrCode
} from 'lucide-react';

export function ShipmentPreparation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  // Récupérer les expéditions
  const { data: shipments = [] } = useQuery({
    queryKey: ['logistics-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_shipments')
        .select(`
          *,
          base_origin:bases!logistics_shipments_base_origin_id_fkey(name),
          base_destination:bases!logistics_shipments_base_destination_id_fkey(name),
          created_by_profile:profiles!logistics_shipments_created_by_fkey(name),
          logistics_shipment_items(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Récupérer les bases de destination
  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const createShipment = async (formData: any) => {
    try {
      setIsCreating(true);
      
      const { data, error } = await supabase
        .from('logistics_shipments')
        .insert({
          shipment_number: '', // Sera généré par le trigger
          base_destination_id: formData.destinationBaseId,
          estimated_arrival_date: formData.estimatedArrival,
          carrier: formData.carrier,
          notes: formData.notes
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Expédition créée',
        description: `Expédition ${data.shipment_number} créée avec succès`
      });

      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });
      setIsCreating(false);
    } catch (error) {
      console.error('Erreur création expédition:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'expédition',
        variant: 'destructive'
      });
      setIsCreating(false);
    }
  };

  const updateShipmentStatus = async (shipmentId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'shipped') {
        updateData.shipped_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('logistics_shipments')
        .update(updateData)
        .eq('id', shipmentId);

      if (error) throw error;

      toast({
        title: 'Statut mis à jour',
        description: `Expédition mise à jour vers: ${status}`
      });

      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      preparing: { label: 'En préparation', variant: 'secondary' as const },
      ready: { label: 'Prêt à expédier', variant: 'default' as const },
      shipped: { label: 'Expédié', variant: 'default' as const },
      delivered: { label: 'Livré', variant: 'default' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'secondary' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton création */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Préparation Expéditions</h2>
          <p className="text-muted-foreground">
            Gestion des expéditions depuis la Métropole
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Expédition
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une nouvelle expédition</DialogTitle>
              <DialogDescription>
                Préparer une expédition vers une base
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createShipment({
                  destinationBaseId: formData.get('destinationBaseId'),
                  estimatedArrival: formData.get('estimatedArrival'),
                  carrier: formData.get('carrier'),
                  notes: formData.get('notes')
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="destinationBaseId">Base de destination</Label>
                <Select name="destinationBaseId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une base" />
                  </SelectTrigger>
                  <SelectContent>
                    {bases.map((base) => (
                      <SelectItem key={base.id} value={base.id}>
                        {base.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="estimatedArrival">Date d'arrivée estimée</Label>
                <Input
                  type="date"
                  name="estimatedArrival"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="carrier">Transporteur</Label>
                <Input
                  name="carrier"
                  placeholder="Ex: DHL, Chronopost..."
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  name="notes"
                  placeholder="Informations complémentaires..."
                />
              </div>
              
              <Button type="submit" disabled={isCreating} className="w-full">
                {isCreating ? 'Création...' : 'Créer l\'expédition'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des expéditions */}
      <div className="grid gap-4">
        {shipments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune expédition en cours</p>
              <p className="text-sm text-muted-foreground">
                Créez votre première expédition pour commencer
              </p>
            </CardContent>
          </Card>
        ) : (
          shipments.map((shipment) => (
            <Card key={shipment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {shipment.shipment_number}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Vers: {shipment.base_destination?.name}
                    </p>
                  </div>
                  {getStatusBadge(shipment.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Articles</p>
                    <p className="text-2xl font-bold">
                      {shipment.logistics_shipment_items?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Colis</p>
                    <p className="text-2xl font-bold">{shipment.total_packages}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Transporteur</p>
                    <p className="text-sm">{shipment.carrier || 'Non défini'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedShipment(shipment)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                  
                  {shipment.status === 'preparing' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateShipmentStatus(shipment.id, 'ready')}
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      Marquer Prêt
                    </Button>
                  )}
                  
                  {shipment.status === 'ready' && (
                    <Button 
                      size="sm"
                      onClick={() => updateShipmentStatus(shipment.id, 'shipped')}
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      Expédier
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}