import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CustomerAutocomplete } from '@/components/customers/CustomerAutocomplete';
import { AdministrativeCheckinFormWithRelations } from '@/types/checkin';
import { Customer } from '@/types/customer';

interface EditFormDialogProps {
  form: AdministrativeCheckinFormWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditFormDialog({ form, open, onOpenChange, onSuccess }: EditFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(form.customer);
  const [selectedBoatId, setSelectedBoatId] = useState(form.boat_id || '');
  const [startDate, setStartDate] = useState<Date>(new Date(form.planned_start_date));
  const [endDate, setEndDate] = useState<Date>(new Date(form.planned_end_date));
  const [rentalNotes, setRentalNotes] = useState(form.rental_notes || '');
  const [specialInstructions, setSpecialInstructions] = useState(form.special_instructions || '');

  const { data: boats } = useQuery({
    queryKey: ['boats', user?.baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('*')
        .eq('base_id', user?.baseId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.baseId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('administrative_checkin_forms')
        .update({
          customer_id: selectedCustomer.id,
          boat_id: selectedBoatId || null,
          suggested_boat_id: selectedBoatId || null,
          planned_start_date: startDate.toISOString(),
          planned_end_date: endDate.toISOString(),
          rental_notes: rentalNotes,
          special_instructions: specialInstructions,
          is_boat_assigned: !!selectedBoatId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', form.id)
        .neq('status', 'used');

      if (error) throw error;

      toast.success('Fiche modifiée avec succès');
      onSuccess();
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la fiche client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <CustomerAutocomplete
              value={selectedCustomer}
              onChange={setSelectedCustomer}
            />
          </div>

          <div className="space-y-2">
            <Label>Bateau</Label>
            <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bateau" />
              </SelectTrigger>
              <SelectContent>
                {boats?.map((boat) => (
                  <SelectItem key={boat.id} value={boat.id}>
                    {boat.name} - {boat.model} ({boat.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP', { locale: fr }) : 'Choisir une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP', { locale: fr }) : 'Choisir une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes de location</Label>
            <Textarea
              value={rentalNotes}
              onChange={(e) => setRentalNotes(e.target.value)}
              placeholder="Notes sur la location..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Instructions spéciales</Label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Instructions spéciales..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
