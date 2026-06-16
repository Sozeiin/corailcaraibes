import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PhotoCapture } from '@/components/supply/PhotoCapture';
import { StockItem } from '@/types';

interface QuickSupplyRequestDialogProps {
  item: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSupplyRequestDialog({ item, isOpen, onClose }: QuickSupplyRequestDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setQuantity(1);
      setUrgency('normal');
      setDescription('');
      setPhotoUrl(item.photoUrl || null);
    }
  }, [isOpen, item]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error('Aucun article sélectionné');

      const requestData = {
        item_name: item.name,
        item_reference: item.reference || null,
        description: description || null,
        quantity_needed: quantity,
        urgency_level: urgency,
        boat_id: null,
        photo_url: photoUrl || null,
        base_id: user?.baseId,
        requested_by: user?.id,
        stock_item_id: item.id,
      };

      const { data, error } = await supabase
        .from('supply_requests')
        .insert(requestData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
      toast({
        title: "Demande envoyée",
        description: "Votre demande d'achats a été créée avec succès.",
      });
      onClose();
    },
    onError: (error) => {
      console.error('Error creating supply request:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi de la demande.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Demande d'achats
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Article</Label>
            <Input value={item?.name || ''} readOnly className="bg-muted" />
          </div>

          {item?.reference && (
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input value={item.reference} readOnly className="bg-muted" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité à commander *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgence</Label>
              <Select value={urgency} onValueChange={(v: any) => setUrgency(v)}>
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Élevé</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Précisions sur la demande..."
            />
          </div>

          <div className="space-y-2">
            <Label>Photo {item?.photoUrl ? '' : '(à ajouter si nécessaire)'}</Label>
            <PhotoCapture photoUrl={photoUrl} onPhotoChange={setPhotoUrl} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Envoi...' : 'Envoyer ma demande d\'achats'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
