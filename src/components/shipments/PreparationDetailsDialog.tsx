import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, FileText, Truck } from 'lucide-react';
import { BoxManager } from './BoxManager';
import { PreparationPDF } from './PreparationPDF';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

interface PreparationDetailsDialogProps {
  preparation: ShipmentPreparation;
  bases: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusLabels = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  closed: 'Clôturée',
  shipped: 'Expédiée',
  completed: 'Terminée'
};

export function PreparationDetailsDialog({ 
  preparation, 
  bases, 
  open, 
  onOpenChange, 
  onUpdate 
}: PreparationDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Récupérer les cartons
  const { data: boxes = [], refetch: refetchBoxes } = useOfflineData<any>({
    table: 'shipment_boxes',
    dependencies: [preparation.id]
  });

  // Filtrer les cartons pour cette préparation
  const preparationBoxes = boxes.filter((box: any) => box.preparation_id === preparation.id);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString();
      } else if (newStatus === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('shipment_preparations')
        .update(updateData)
        .eq('id', preparation.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Préparation ${statusLabels[newStatus as keyof typeof statusLabels].toLowerCase()}.`
      });

      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const canAddBoxes = preparation.status === 'draft' || preparation.status === 'in_progress';
  const canClose = preparation.status === 'in_progress' && preparationBoxes.length > 0 && preparationBoxes.every((box: any) => box.status === 'closed');
  const canShip = preparation.status === 'closed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{preparation.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Référence: {preparation.reference}
              </p>
            </div>
            <Badge variant="secondary">
              {statusLabels[preparation.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations générales */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Expédition</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>De:</strong> {bases[preparation.source_base_id]?.name || 'Base source'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Vers:</strong> {bases[preparation.destination_base_id]?.name || 'Base destination'}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Statistiques</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Cartons:</strong> {preparation.total_boxes}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Articles:</strong> {preparation.total_items}
                </p>
              </div>
            </div>
            {preparation.notes && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{preparation.notes}</p>
              </div>
            )}
          </Card>

          {/* Actions */}
          {(canClose || canShip) && (
            <Card className="p-4">
              <div className="flex flex-wrap gap-2">
                {canClose && (
                  <Button 
                    onClick={() => handleStatusChange('closed')}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Clôturer la préparation
                  </Button>
                )}
                {!canClose && preparation.status === 'in_progress' && (
                  <p className="text-sm text-muted-foreground">
                    Fermez tous les cartons pour pouvoir clôturer la préparation.
                  </p>
                )}
                {canShip && (
                  <Button 
                    onClick={() => handleStatusChange('shipped')}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Truck className="h-4 w-4" />
                    Marquer comme expédiée
                  </Button>
                )}
                {preparation.status === 'shipped' && (
                  <Button 
                    onClick={() => handleStatusChange('completed')}
                    disabled={loading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Marquer comme terminée
                  </Button>
                )}
                {preparation.status === 'closed' && (
                  <PreparationPDF preparation={preparation} boxes={preparationBoxes} bases={bases} />
                )}
              </div>
            </Card>
          )}

          {/* Contenu principal */}
          <Tabs defaultValue="boxes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="boxes">Cartons</TabsTrigger>
              <TabsTrigger value="summary">Récapitulatif</TabsTrigger>
            </TabsList>
            
            <TabsContent value="boxes" className="space-y-4">
              <BoxManager 
                preparationId={preparation.id}
                canAddBoxes={canAddBoxes}
                onUpdate={() => {
                  refetchBoxes();
                  onUpdate();
                }}
              />
            </TabsContent>
            
            <TabsContent value="summary" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-medium mb-4">Récapitulatif de l'expédition</h3>
                {preparationBoxes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun carton créé pour cette préparation.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {preparationBoxes.map((box: any) => (
                      <div key={box.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Carton {box.box_identifier}</h4>
                          <Badge variant={box.status === 'closed' ? 'default' : 'secondary'}>
                            {box.status === 'closed' ? 'Fermé' : 'Ouvert'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {box.total_items} article{box.total_items > 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}