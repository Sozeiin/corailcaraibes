import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, FileText, Truck, Scan, Trash2 } from 'lucide-react';
import { BoxManager } from './BoxManager';
import { PreparationPDF } from './PreparationPDF';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDeleteShipmentPreparation } from '@/hooks/useShipmentPreparationMutations';

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
  tracking_number?: string;
  carrier?: string;
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
  const [trackingNumber, setTrackingNumber] = useState(preparation.tracking_number || '');
  const [carrier, setCarrier] = useState(preparation.carrier || '');
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const deletePreparation = useDeleteShipmentPreparation();

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
        if (trackingNumber) updateData.tracking_number = trackingNumber;
        if (carrier) updateData.carrier = carrier;
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

  const handleDelete = async () => {
    await deletePreparation.mutateAsync(preparation.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
    onUpdate();
  };

  const canAddBoxes = preparation.status === 'draft' || preparation.status === 'in_progress';
  const closedBoxes = preparationBoxes.filter((box: any) => box.status === 'closed');
  const allBoxesClosed = preparationBoxes.length > 0 && closedBoxes.length === preparationBoxes.length;
  const canClose = preparation.status === 'in_progress' && allBoxesClosed;
  const canShip = preparation.status === 'closed';
  const canDelete = preparation.status === 'draft' || preparation.status === 'in_progress';
  const hasPDF = preparationBoxes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{preparation.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Référence: {preparation.reference}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {statusLabels[preparation.status]}
              </Badge>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
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
          {(canClose || canShip || preparation.status === 'draft' || preparation.status === 'shipped') && (
            <Card className="p-4">
              <div className="flex flex-col gap-4">
                {/* Actions de workflow */}
                <div className="flex flex-wrap gap-2">
                  {preparation.status === 'draft' && (
                    <Button 
                      onClick={() => handleStatusChange('in_progress')}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Démarrer la préparation
                    </Button>
                  )}
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
                    <div className="text-sm text-muted-foreground">
                      {preparationBoxes.length === 0 ? (
                        <p>Créez au moins un carton pour pouvoir clôturer la préparation.</p>
                      ) : (
                        <p>Fermez tous les cartons pour pouvoir clôturer la préparation. 
                          ({closedBoxes.length}/{preparationBoxes.length} cartons fermés)</p>
                      )}
                    </div>
                  )}
                  {canShip && (
                    <>
                      {!showTrackingForm && (
                        <Button 
                          onClick={() => setShowTrackingForm(true)}
                          disabled={loading}
                          className="flex items-center gap-2"
                        >
                          <Truck className="h-4 w-4" />
                          Marquer comme expédiée
                        </Button>
                      )}
                    </>
                  )}
                  {preparation.status === 'shipped' && (
                    <Button 
                      onClick={() => window.location.href = `/scanner?mode=reception&shipment=${preparation.id}`}
                      variant="default"
                      className="flex items-center gap-2"
                    >
                      <Scan className="h-4 w-4" />
                      Recevoir cette expédition
                    </Button>
                  )}
                  {hasPDF && (
                    <PreparationPDF preparation={preparation} boxes={preparationBoxes} bases={bases} />
                  )}
                </div>

                {/* Formulaire de tracking */}
                {showTrackingForm && canShip && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-medium text-sm">Informations d'expédition</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="carrier">Transporteur</Label>
                        <Input
                          id="carrier"
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          placeholder="Ex: DHL, FedEx..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tracking">Numéro de suivi</Label>
                        <Input
                          id="tracking"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Numéro de suivi..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleStatusChange('shipped')}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        <Truck className="h-4 w-4" />
                        Confirmer l'expédition
                      </Button>
                      <Button 
                        onClick={() => setShowTrackingForm(false)}
                        variant="outline"
                        disabled={loading}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la préparation "{preparation.name}" ?
              Cette action supprimera également tous les cartons et articles associés.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePreparation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletePreparation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePreparation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}