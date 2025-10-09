import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Package, Anchor } from 'lucide-react';

interface StockMovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: {
    id: string;
    name: string;
    quantity: number;
  };
  removedQuantity: number;
}

export function StockMovementDialog({ 
  isOpen, 
  onClose, 
  stockItem, 
  removedQuantity 
}: StockMovementDialogProps) {
  const { user } = useAuth();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;
  
  // Détection de la base Martinique
  const MARTINIQUE_BASE_ID = '550e8400-e29b-41d4-a716-446655440001';
  const isMartiniqueBase = user?.baseId === MARTINIQUE_BASE_ID;

  // Récupérer la liste des fournisseurs
  const { data: suppliers = [] } = useOfflineData<any>({
    table: 'suppliers',
    baseId,
    dependencies: [user?.role, user?.baseId]
  });

  // Récupérer la liste des bateaux (seulement pour Martinique)
  const { data: boats = [] } = useOfflineData<any>({
    table: 'boats',
    baseId: isMartiniqueBase ? baseId : undefined,
    dependencies: [user?.role, user?.baseId, isMartiniqueBase]
  });

  const handleSubmit = async () => {
    // Validation selon la base
    if (isMartiniqueBase) {
      // Pour Martinique : au moins un fournisseur OU un bateau
      if (!selectedSupplierId && !selectedBoatId) {
        toast.error('Veuillez sélectionner au moins un fournisseur/prestataire OU un bateau');
        return;
      }
    } else {
      // Pour les autres bases : fournisseur obligatoire
      if (!selectedSupplierId) {
        toast.error('Veuillez sélectionner un fournisseur/prestataire');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Construction du champ notes selon les sélections
      const buildNotesString = () => {
        const parts = [];
        
        if (selectedSupplierId) {
          parts.push(`fournisseur:${selectedSupplierId}`);
        }
        
        if (isMartiniqueBase && selectedBoatId) {
          parts.push(`bateau:${selectedBoatId}`);
        }
        
        const prefix = parts.length > 0 ? `Sortie vers ${parts.join(' et ')}` : 'Sortie de stock';
        const userNotes = notes.trim();
        
        return userNotes ? `${prefix}. ${userNotes}` : prefix;
      };

      const { error } = await supabase
        .from('stock_movements')
        .insert({
          sku: stockItem.id,
          qty: -Math.abs(removedQuantity), // Négatif pour une sortie
          movement_type: 'outbound_distribution',
          base_id: user?.baseId,
          actor: user?.id,
          notes: buildNotesString(),
          ts: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Sortie de stock enregistrée avec succès');
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du mouvement:', error);
      toast.error('Erreur lors de l\'enregistrement du mouvement de stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedSupplierId('');
    setSelectedBoatId('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Sortie de stock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Article concerné</span>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>{stockItem.name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Quantité sortie : <strong>{removedQuantity}</strong>
            </p>
          </div>

          {isMartiniqueBase && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                ⚠️ Vous devez sélectionner au moins un fournisseur/prestataire <strong>OU</strong> un bateau
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="supplier">
              Fournisseur/Prestataire destinataire {!isMartiniqueBase && '*'}
            </Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fournisseur/prestataire" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier: any) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                    {supplier.category && (
                      <span className="text-muted-foreground ml-1">
                        ({supplier.category})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isMartiniqueBase && (
            <div className="space-y-2">
              <Label htmlFor="boat">
                <div className="flex items-center gap-2">
                  <Anchor className="h-4 w-4" />
                  Bateau destinataire
                </div>
              </Label>
              <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bateau" />
                </SelectTrigger>
                <SelectContent>
                  {boats.map((boat: any) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.name} - {boat.model}
                      {boat.serial_number && (
                        <span className="text-muted-foreground ml-1">
                          ({boat.serial_number})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes (optionnel)
            </Label>
            <Textarea
              id="notes"
              placeholder="Motif de la sortie, contexte du dépannage..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                (isMartiniqueBase ? (!selectedSupplierId && !selectedBoatId) : !selectedSupplierId)
              }
              className="flex-1"
            >
              {isSubmitting ? 'Enregistrement...' : 'Confirmer la sortie'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}