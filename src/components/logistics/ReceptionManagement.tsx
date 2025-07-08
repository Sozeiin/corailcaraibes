import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  PackageCheck, 
  Package, 
  AlertCircle,
  CheckCircle,
  QrCode
} from 'lucide-react';
import { MobileScanning } from '../purchasing/MobileScanning';

export function ReceptionManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Récupérer les expéditions en attente de réception
  const { data: pendingShipments = [] } = useQuery({
    queryKey: ['pending-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_shipments')
        .select(`
          *,
          base_origin:bases!logistics_shipments_base_origin_id_fkey(name),
          base_destination:bases!logistics_shipments_base_destination_id_fkey(name),
          logistics_shipment_items(*),
          logistics_receipts(*)
        `)
        .eq('status', 'shipped')
        .order('shipped_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Récupérer les réceptions existantes
  const { data: receipts = [] } = useQuery({
    queryKey: ['logistics-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_receipts')
        .select(`
          *,
          shipment:logistics_shipments(*),
          received_by_profile:profiles!logistics_receipts_received_by_fkey(name),
          logistics_receipt_items(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const createReceipt = async (shipmentId: string) => {
    try {
      const { data: shipment } = await supabase
        .from('logistics_shipments')
        .select('*, logistics_shipment_items(*)')
        .eq('id', shipmentId)
        .single();

      if (!shipment) return;

      // Créer la réception
      const { data: receipt, error: receiptError } = await supabase
        .from('logistics_receipts')
        .insert({
          receipt_number: '', // Sera généré par le trigger
          shipment_id: shipmentId,
          base_id: shipment.base_destination_id || '', // Base de destination de l'expédition
          packages_expected: shipment.total_packages || 0,
          received_date: new Date().toISOString()
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Créer les lignes d'articles attendus
      if (shipment.logistics_shipment_items) {
        const receiptItems = shipment.logistics_shipment_items.map((item: any) => ({
          receipt_id: receipt.id,
          shipment_item_id: item.id,
          product_name: item.product_name,
          product_reference: item.product_reference,
          quantity_expected: item.quantity_shipped,
          quantity_received: 0,
          quantity_accepted: 0
        }));

        const { error: itemsError } = await supabase
          .from('logistics_receipt_items')
          .insert(receiptItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: 'Réception créée',
        description: `Réception ${receipt.receipt_number} créée avec succès`
      });

      queryClient.invalidateQueries({ queryKey: ['logistics-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-shipments'] });
    } catch (error) {
      console.error('Erreur création réception:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la réception',
        variant: 'destructive'
      });
    }
  };

  const validateReceipt = async (receiptId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('logistics_receipts')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          condition_notes: notes
        })
        .eq('id', receiptId);

      if (error) throw error;

      // Mettre à jour le statut de l'expédition
      const { data: receipt } = await supabase
        .from('logistics_receipts')
        .select('shipment_id')
        .eq('id', receiptId)
        .single();

      if (receipt?.shipment_id) {
        await supabase
          .from('logistics_shipments')
          .update({ status: 'delivered' })
          .eq('id', receipt.shipment_id);
      }

      toast({
        title: 'Réception validée',
        description: 'La réception a été validée avec succès'
      });

      queryClient.invalidateQueries({ queryKey: ['logistics-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-shipments'] });
    } catch (error) {
      console.error('Erreur validation réception:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de valider la réception',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'En attente', variant: 'secondary' as const },
      receiving: { label: 'En cours', variant: 'default' as const },
      validated: { label: 'Validée', variant: 'default' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'secondary' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (showScanner) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Scanner Réception</h2>
          <Button 
            variant="outline" 
            onClick={() => setShowScanner(false)}
          >
            Retour
          </Button>
        </div>
        <MobileScanning />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Réceptions</h2>
          <p className="text-muted-foreground">
            Réception et validation des expéditions
          </p>
        </div>
        <Button onClick={() => setShowScanner(true)}>
          <QrCode className="h-4 w-4 mr-2" />
          Scanner Articles
        </Button>
      </div>

      {/* Expéditions en attente de réception */}
      {pendingShipments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Expéditions en attente</h3>
          <div className="grid gap-4">
            {pendingShipments.map((shipment) => (
              <Card key={shipment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {shipment.shipment_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Depuis: {shipment.base_origin?.name}
                      </p>
                    </div>
                    <Badge variant="secondary">En transit</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm">
                        <strong>{shipment.logistics_shipment_items?.length || 0}</strong> articles
                        • <strong>{shipment.total_packages}</strong> colis
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expédié le {new Date(shipment.shipped_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Button 
                      onClick={() => createReceipt(shipment.id)}
                      size="sm"
                    >
                      <PackageCheck className="h-4 w-4 mr-1" />
                      Créer Réception
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Réceptions existantes */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Réceptions</h3>
        <div className="grid gap-4">
          {receipts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <PackageCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aucune réception enregistrée</p>
              </CardContent>
            </Card>
          ) : (
            receipts.map((receipt) => (
              <Card key={receipt.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <PackageCheck className="h-5 w-5" />
                        {receipt.receipt_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Expédition: {receipt.shipment?.shipment_number}
                      </p>
                    </div>
                    {getStatusBadge(receipt.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Articles</p>
                      <p className="text-2xl font-bold">
                        {receipt.logistics_receipt_items?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Colis reçus</p>
                      <p className="text-2xl font-bold">
                        {receipt.packages_received}/{receipt.packages_expected}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Reçu le</p>
                      <p className="text-sm">
                        {receipt.received_date 
                          ? new Date(receipt.received_date).toLocaleDateString('fr-FR')
                          : 'Non défini'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {receipt.status === 'pending' && (
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Valider Réception
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Valider la réception</DialogTitle>
                            <DialogDescription>
                              Confirmer la réception de {receipt.receipt_number}
                            </DialogDescription>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              validateReceipt(receipt.id, formData.get('notes') as string);
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <label className="text-sm font-medium">Notes de réception</label>
                              <Textarea
                                name="notes"
                                placeholder="État des colis, remarques..."
                                className="mt-1"
                              />
                            </div>
                            <Button type="submit" className="w-full">
                              Valider la réception
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  
                  {receipt.status === 'validated' && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        ✅ Réception validée
                      </p>
                      {receipt.condition_notes && (
                        <p className="text-xs text-green-600 mt-1">
                          {receipt.condition_notes}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}