import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PreparationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  bases: any[];
}

export function PreparationDialog({ open, onOpenChange, onSuccess, bases }: PreparationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    source_base_id: user?.baseId || '',
    destination_base_id: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.source_base_id || !formData.destination_base_id) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.source_base_id === formData.destination_base_id) {
      toast({
        title: 'Erreur',
        description: 'La base source et la base destination doivent être différentes.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shipment_preparations')
        .insert({
          name: formData.name,
          source_base_id: formData.source_base_id,
          destination_base_id: formData.destination_base_id,
          notes: formData.notes || null,
          created_by: user?.id,
          status: 'draft',
          reference: '' // Auto-généré par le trigger
        });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Préparation d\'expédition créée avec succès.'
      });

      setFormData({ name: '', source_base_id: user?.baseId || '', destination_base_id: '', notes: '' });
      onSuccess();
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la préparation d\'expédition.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDestinationBases = bases.filter(base => base.id !== formData.source_base_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle préparation d'expédition</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de l'expédition *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Expédition matériel Martinique"
              required
            />
          </div>

          <div>
            <Label htmlFor="source_base">Base expéditrice *</Label>
            <select
              id="source_base"
              value={formData.source_base_id}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                source_base_id: e.target.value,
                destination_base_id: prev.destination_base_id === e.target.value ? '' : prev.destination_base_id
              }))}
              className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Sélectionner une base</option>
              {bases.map(base => (
                <option key={base.id} value={base.id}>{base.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="destination_base">Base destinataire *</Label>
            <select
              id="destination_base"
              value={formData.destination_base_id}
              onChange={(e) => setFormData(prev => ({ ...prev, destination_base_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Sélectionner une base</option>
              {filteredDestinationBases.map(base => (
                <option key={base.id} value={base.id}>{base.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes additionnelles..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}