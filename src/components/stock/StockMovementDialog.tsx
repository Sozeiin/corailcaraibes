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
import { Truck, Package } from 'lucide-react';

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
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;

  // Récupérer la liste des fournisseurs
  const { data: suppliers = [] } = useOfflineData<any>({
    table: 'suppliers',
    baseId,
    dependencies: [user?.role, user?.baseId]
  });

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      toast.error('Veuillez sélectionner un fournisseur/prestataire');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('stock_movements')
        .insert({
          sku: stockItem.id,
          qty: -Math.abs(removedQuantity), // Négatif pour une sortie
          movement_type: 'outbound_distribution',
          base_id: user?.baseId,
          actor: user?.id,
          notes: `Sortie vers fournisseur:${selectedSupplierId}. ${notes.trim() || ''}`.trim(),
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

          <div className="space-y-2">
            <Label htmlFor="supplier">
              Fournisseur/Prestataire destinataire *
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
              disabled={isSubmitting || !selectedSupplierId}
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