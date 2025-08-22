import React, { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface BoatSafetyControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boatId: string;
  control?: any;
  categories: any[];
  year: number;
}

export const BoatSafetyControlDialog = ({ 
  open, 
  onOpenChange, 
  boatId, 
  control, 
  categories, 
  year 
}: BoatSafetyControlDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    category_id: '',
    control_date: undefined as Date | undefined,
    next_control_date: undefined as Date | undefined,
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    if (control) {
      setFormData({
        category_id: control.category_id || '',
        control_date: control.control_date ? new Date(control.control_date) : undefined,
        next_control_date: control.next_control_date ? new Date(control.next_control_date) : undefined,
        status: control.status || 'pending',
        notes: control.notes || '',
      });
    } else {
      setFormData({
        category_id: '',
        control_date: undefined,
        next_control_date: undefined,
        status: 'pending',
        notes: '',
      });
    }
  }, [control]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (control) {
        const { error } = await supabase
          .from('boat_safety_controls')
          .update(data)
          .eq('id', control.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('boat_safety_controls')
          .insert({
            ...data,
            boat_id: boatId,
            control_year: year,
            performed_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boat-safety-controls'] });
      toast({
        title: "Succès",
        description: control ? "Contrôle de sécurité modifié avec succès" : "Contrôle de sécurité créé avec succès",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
      console.error('Error saving safety control:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un type de contrôle",
        variant: "destructive",
      });
      return;
    }

    const dataToSave = {
      ...formData,
      control_date: formData.control_date?.toISOString().split('T')[0] || null,
      next_control_date: formData.next_control_date?.toISOString().split('T')[0] || null,
    };

    saveMutation.mutate(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {control ? 'Modifier le contrôle de sécurité' : 'Nouveau contrôle de sécurité'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Type de contrôle *</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color_code }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="completed">Effectué</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de contrôle</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.control_date ? (
                      format(formData.control_date, 'dd/MM/yyyy', { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.control_date}
                    onSelect={(date) => setFormData({ ...formData, control_date: date })}
                    locale={fr}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Prochaine échéance</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.next_control_date ? (
                      format(formData.next_control_date, 'dd/MM/yyyy', { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.next_control_date}
                    onSelect={(date) => setFormData({ ...formData, next_control_date: date })}
                    locale={fr}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes et observations</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes sur le contrôle, observations, actions requises..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Enregistrement...' : (control ? 'Modifier' : 'Créer')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};