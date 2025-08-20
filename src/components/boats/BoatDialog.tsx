import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Ship } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Boat } from '@/types';

interface BoatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boat?: Boat | null;
}

export function BoatDialog({ isOpen, onClose, boat }: BoatDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [bases, setBases] = useState<Array<{ id: string; name: string }>>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    hin: '',
    hullNumber: '',
    year: new Date().getFullYear(),
    status: 'available' as 'available' | 'rented' | 'maintenance' | 'out_of_service',
    baseId: '',
    nextMaintenance: '',
  });

  useEffect(() => {
    const fetchBases = async () => {
      if (user?.role === 'direction') {
        const { data } = await supabase.from('bases').select('id, name').order('name');
        setBases(data || []);
      } else if (user?.baseId) {
        const { data } = await supabase.from('bases').select('id, name').eq('id', user.baseId);
        setBases(data || []);
      }
    };

    if (isOpen) {
      fetchBases();
      
      if (boat) {
        console.log('Loading boat for edit:', boat); // Debug log
        setFormData({
          name: boat.name,
          model: boat.model,
          hin: boat.serialNumber,
          hullNumber: '',
          year: boat.year,
          status: boat.status,
          baseId: boat.baseId || '',
          nextMaintenance: boat.nextMaintenance || '',
        });
      } else {
        setFormData({
          name: '',
          model: '',
          hin: '',
          hullNumber: '',
          year: new Date().getFullYear(),
          status: 'available',
          baseId: user?.baseId || '',
          nextMaintenance: '',
        });
      }
    }
  }, [isOpen, boat, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const boatData = {
        name: formData.name,
        model: formData.model,
        serial_number: formData.hin,
        year: formData.year,
        status: formData.status,
        base_id: formData.baseId,
        next_maintenance: formData.nextMaintenance || null,
        updated_at: new Date().toISOString(),
      };

      console.log('Saving boat with data:', boatData); // Debug log

      if (boat) {
        // Update existing boat
        const { data: updatedData, error } = await supabase
          .from('boats')
          .update(boatData)
          .eq('id', boat.id)
          .select(); // Récupère les données mises à jour

        if (error) throw error;
        
        console.log('Boat updated successfully:', updatedData); // Debug log

        toast({
          title: 'Bateau modifié',
          description: `${formData.name} a été modifié avec succès.`,
        });
      } else {
        // Create new boat
        const { error } = await supabase
          .from('boats')
          .insert({
            ...boatData,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;

        toast({
          title: 'Bateau créé',
          description: `${formData.name} a été ajouté à la flotte.`,
        });
      }

      
      // Force refresh of the boats data
      await queryClient.invalidateQueries({ queryKey: ['boats'] });
      await queryClient.refetchQueries({ queryKey: ['boats'] });
      onClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le bateau.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Ship className="h-4 w-4 sm:h-5 sm:w-5" />
            {boat ? 'Modifier le bateau' : 'Nouveau bateau'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {boat ? 'Modifiez les informations du bateau.' : 'Ajoutez un nouveau bateau à la flotte.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm">Nom du bateau *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Évasion"
              required
              className="text-sm"
            />
          </div>

          <div>
            <Label htmlFor="model" className="text-sm">Modèle *</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              placeholder="Ex: Lagoon 380"
              required
              className="text-sm"
            />
          </div>

          <div>
            <Label htmlFor="hin" className="text-sm">N° HIN *</Label>
            <Input
              id="hin"
              value={formData.hin}
              onChange={(e) => setFormData(prev => ({ ...prev, hin: e.target.value }))}
              placeholder="Ex: FR-HIN123456789"
              required
              className="text-sm"
            />
          </div>

          <div>
            <Label htmlFor="hullNumber" className="text-sm">N° de coque</Label>
            <Input
              id="hullNumber"
              value={formData.hullNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, hullNumber: e.target.value }))}
              placeholder="Ex: LAG380-2020-001"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="year" className="text-sm">Année *</Label>
              <Input
                id="year"
                type="number"
                min="1990"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                required
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="status" className="text-sm">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="rented">En location</SelectItem>
                  <SelectItem value="maintenance">En maintenance</SelectItem>
                  <SelectItem value="out_of_service">Hors service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="base" className="text-sm">Base *</Label>
            <Select
              value={formData.baseId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, baseId: value }))}
              required
            >
              <SelectTrigger className="text-sm">
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
            <Label htmlFor="nextMaintenance" className="text-sm">Prochaine maintenance</Label>
            <Input
              id="nextMaintenance"
              type="date"
              value={formData.nextMaintenance}
              onChange={(e) => setFormData(prev => ({ ...prev, nextMaintenance: e.target.value }))}
              className="text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} size="sm" className="text-sm">
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.model || !formData.hin || !formData.baseId} size="sm" className="text-sm">
              {loading ? 'Sauvegarde...' : boat ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}