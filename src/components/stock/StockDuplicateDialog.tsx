import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StockItem } from '@/types';
import { executeWithSchemaReload } from '@/lib/supabase/schemaReload';

interface StockDuplicateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem | null;
}

export function StockDuplicateDialog({ isOpen, onClose, item }: StockDuplicateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    baseId: '',
    quantity: 0,
    location: '',
  });

  // Récupérer les bases disponibles
  const [bases, setBases] = useState<Array<{ id: string; name: string }>>([]);

  React.useEffect(() => {
    const fetchBases = async () => {
      if (user?.role === 'direction') {
        const { data } = await supabase.from('bases').select('id, name');
        setBases(data || []);
      } else if (user?.baseId) {
        // Pour les autres rôles, récupérer toutes les bases mais filtrer celle de l'utilisateur
        const { data } = await supabase.from('bases').select('id, name');
        setBases((data || []).filter(base => base.id !== user.baseId));
      }
    };

    if (isOpen) {
      fetchBases();
      setFormData({
        baseId: '',
        quantity: item?.quantity || 0,
        location: item?.location || '',
      });
    }
  }, [isOpen, user, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !formData.baseId) return;

    setLoading(true);
    try {
      const { error } = await executeWithSchemaReload(supabase, () =>
        supabase
          .from('stock_items')
          .insert({
            name: item.name,
            reference: item.reference,
            brand: item.brand,
            supplier_reference: item.supplierReference,
            category: item.category,
            quantity: formData.quantity,
            min_threshold: item.minThreshold,
            unit: item.unit,
            location: formData.location,
            base_id: formData.baseId,
            last_updated: new Date().toISOString(),
          })
      );

      if (error) throw error;

      toast({
        title: 'Article dupliqué',
        description: `L'article "${item.name}" a été ajouté sur la nouvelle base.`,
      });

      queryClient.invalidateQueries({ queryKey: ['stock'] });
      onClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de dupliquer l\'article.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Dupliquer l'article
          </DialogTitle>
          <DialogDescription>
            Ajouter "{item.name}" sur une autre base avec des paramètres spécifiques.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="base">Base de destination *</Label>
            <Select
              value={formData.baseId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, baseId: value }))}
              required
            >
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
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <Label htmlFor="location">Emplacement</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Emplacement sur la nouvelle base"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !formData.baseId}>
              {loading ? 'Duplication...' : 'Dupliquer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}