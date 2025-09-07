import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScanInput } from '@/components/distribution/ScanInput';
import { ItemsList } from '@/components/distribution/ItemsList';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Receipt, Package, CheckCircle } from 'lucide-react';

interface ReceptionState {
  selectedShipment: any;
  openPackage: any;
}

export function ReceptionTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reception, setReception] = useState<ReceptionState>({
    selectedShipment: null,
    openPackage: null
  });
  const [selectedBaseId, setSelectedBaseId] = useState(user?.baseId || '');

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

  // Fetch shipments ready for reception
  const { data: shipments = [], refetch: refetchShipments } = useQuery({
    queryKey: ['shipments-reception', selectedBaseId],
    queryFn: async () => {
      if (!selectedBaseId) return [];
      
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          shipment_items(*),
          shipment_packages(*)
        `)
        .eq('destination_base_id', selectedBaseId)
        .in('status', ['shipped', 'received', 'received_with_discrepancy']);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBaseId
  });

  // Receive scan mutation
  const receiveScanMutation = useMutation({
    mutationFn: async ({ 
      shipmentId, 
      sku, 
      qty, 
      packageCode 
    }: { 
      shipmentId: string; 
      sku: string; 
      qty: number; 
      packageCode?: string; 
    }) => {
      const scanEventId = crypto.randomUUID();
      
      const { data, error } = await supabase.rpc('receive_scan', {
        p_shipment_id: shipmentId,
        p_sku: sku,
        p_qty: qty,
        p_package_code: packageCode || null,
        p_scan_event_id: scanEventId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchShipments();
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      toast({
        title: 'Article reçu',
        description: 'L\'article a été ajouté au stock de destination.'
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

  // Reconcile shipment mutation
  const reconcileMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const { data, error } = await supabase.rpc('reconcile_shipment', {
        p_shipment_id: shipmentId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (status) => {
      refetchShipments();
      setReception({ selectedShipment: null, openPackage: null });
      
      const message = status === 'reconciled' 
        ? 'Réception complète - tous les articles ont été reçus.'
        : 'Réception avec écarts - certains articles manquent.';
      
      toast({
        title: 'Réception validée',
        description: message
      });
    }
  });

  const handleScan = (value: string) => {
    // Déterminer si c'est un scan de colis ou d'article
    if (value.includes('|')) {
      // Format QR colis: shipment_id|package_code
      const [shipmentId, packageCode] = value.split('|');
      const shipment = shipments.find(s => s.id === shipmentId);
      
      if (shipment) {
        const pkg = shipment.shipment_packages?.find((p: any) => p.package_code === packageCode);
        setReception({
          selectedShipment: shipment,
          openPackage: pkg
        });
        
        toast({
          title: 'Colis ouvert',
          description: `Prêt à recevoir les articles du colis ${packageCode}`
        });
      } else {
        toast({
          title: 'Colis non trouvé',
          description: 'Ce colis n\'existe pas ou n\'est pas destiné à cette base.',
          variant: 'destructive'
        });
      }
    } else {
      // Scan d'article
      if (reception.selectedShipment) {
        receiveScanMutation.mutate({
          shipmentId: reception.selectedShipment.id,
          sku: value,
          qty: 1,
          packageCode: reception.openPackage?.package_code
        });
      } else {
        // Proposer de sélectionner un colis
        const availableShipments = shipments.filter(s => 
          s.shipment_items?.some((item: any) => item.sku === value)
        );
        
        if (availableShipments.length === 1) {
          receiveScanMutation.mutate({
            shipmentId: availableShipments[0].id,
            sku: value,
            qty: 1
          });
        } else if (availableShipments.length > 1) {
          toast({
            title: 'Plusieurs expéditions possibles',
            description: 'Veuillez d\'abord scanner un colis ou sélectionner une expédition.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Article non trouvé',
            description: 'Cet article n\'est attendu dans aucune expédition.',
            variant: 'destructive'
          });
        }
      }
    }
  };

  const calculateProgress = (shipment: any) => {
    if (!shipment.shipment_items) return 0;
    
    const totalExpected = shipment.shipment_items.reduce((sum: number, item: any) => sum + item.qty, 0);
    const totalReceived = shipment.shipment_items.reduce((sum: number, item: any) => sum + (item.received_qty || 0), 0);
    
    return totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;
  };

  const canReconcile = (shipment: any) => {
    return shipment.shipment_items?.some((item: any) => (item.received_qty || 0) > 0);
  };

  return (
    <div className="space-y-6">
      {/* Sélection de la base */}
      <Card>
        <CardHeader>
          <CardTitle>Base de destination</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedBaseId}
            onValueChange={setSelectedBaseId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner la base de destination" />
            </SelectTrigger>
            <SelectContent>
              {bases.map((base) => (
                <SelectItem key={base.id} value={base.id}>
                  {base.name} ({base.location})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBaseId && (
        <>
          {/* Scanner */}
          <ScanInput 
            onScan={handleScan} 
            disabled={receiveScanMutation.isPending}
            placeholder="Scanner un colis (QR) ou un article (code-barres)"
          />

          {/* Expédition ouverte */}
          {reception.selectedShipment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Réception en cours</span>
                  <Button
                    variant="outline"
                    onClick={() => setReception({ selectedShipment: null, openPackage: null })}
                  >
                    Fermer
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      Expédition depuis {bases.find(b => b.id === reception.selectedShipment.source_base_id)?.name}
                    </p>
                    {reception.openPackage && (
                      <p className="text-sm text-muted-foreground">
                        Colis: {reception.openPackage.package_code}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {Math.round(calculateProgress(reception.selectedShipment))}% reçu
                  </Badge>
                </div>

                <Progress value={calculateProgress(reception.selectedShipment)} className="w-full" />

                <ItemsList 
                  items={reception.selectedShipment.shipment_items || []}
                  showReceivedQty
                  readOnly
                />

                <div className="flex justify-end">
                  <Button
                    onClick={() => reconcileMutation.mutate(reception.selectedShipment.id)}
                    disabled={!canReconcile(reception.selectedShipment) || reconcileMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Valider la réception
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des expéditions en attente */}
          <Card>
            <CardHeader>
              <CardTitle>Expéditions en attente de réception</CardTitle>
            </CardHeader>
            <CardContent>
              {shipments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune expédition en attente</p>
                  <p className="text-sm mt-1">Les expéditions apparaîtront ici une fois envoyées</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shipments.map((shipment) => (
                    <div key={shipment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">
                            Depuis {bases.find(b => b.id === shipment.source_base_id)?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {shipment.shipment_items?.length || 0} article(s) - {' '}
                            {shipment.shipment_packages?.length || 0} colis
                          </p>
                        </div>
                        <Badge 
                          variant={shipment.status === 'shipped' ? 'default' : 'secondary'}
                        >
                          {shipment.status === 'shipped' ? 'En transit' : 
                           shipment.status === 'received' ? 'Reçu' : 'Reçu avec écarts'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Progression</span>
                          <span className="text-sm font-medium">
                            {Math.round(calculateProgress(shipment))}%
                          </span>
                        </div>
                        <Progress value={calculateProgress(shipment)} className="w-full" />
                      </div>

                      <div className="flex justify-end mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setReception({ 
                            selectedShipment: shipment, 
                            openPackage: null 
                          })}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Ouvrir pour réception
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}