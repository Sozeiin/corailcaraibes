import React, { useState } from 'react';
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
import { Customer } from '@/types/customer';

export function CreateCheckinFormSimple() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [rentalNotes, setRentalNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const { data: boats, refetch: refetchBoats } = useQuery({
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

    if (!startDate || !endDate) {
      toast.error('Veuillez sélectionner les dates');
      return;
    }

    setLoading(true);

    try {
      const selectedBoat = boats?.find((b) => b.id === selectedBoatId);
      const isBoatAvailable = selectedBoat?.status === 'available';

      const { error } = await supabase
        .from('administrative_checkin_forms')
        .insert({
          base_id: user?.baseId!,
          customer_id: selectedCustomer.id,
          boat_id: selectedBoatId || null,
          suggested_boat_id: selectedBoatId && !isBoatAvailable ? selectedBoatId : null,
          is_boat_assigned: isBoatAvailable && !!selectedBoatId,
          planned_start_date: startDate.toISOString(),
          planned_end_date: endDate.toISOString(),
          rental_notes: rentalNotes,
          special_instructions: specialInstructions,
          status: isBoatAvailable && selectedBoatId ? 'ready' : 'draft',
          created_by: user?.id!,
        });

      if (error) throw error;

      toast.success('Fiche créée avec succès');
      
      // Reset form
      setSelectedCustomer(null);
      setSelectedBoatId('');
      setStartDate(undefined);
      setEndDate(undefined);
      setRentalNotes('');
      setSpecialInstructions('');
      refetchBoats();
    } catch (error) {
      console.error('Error creating form:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Client *</Label>
        <CustomerAutocomplete
          value={selectedCustomer}
          onChange={setSelectedCustomer}
          placeholder="Rechercher ou créer un client..."
        />
        {selectedCustomer && (
          <div className="p-3 bg-muted rounded-md text-sm space-y-1">
            <p className="font-medium">
              {selectedCustomer.first_name} {selectedCustomer.last_name}
              {selectedCustomer.vip_status && ' (VIP)'}
            </p>
            {selectedCustomer.email && <p>Email: {selectedCustomer.email}</p>}
            {selectedCustomer.phone && <p>Tél: {selectedCustomer.phone}</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Bateau</Label>
        <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un bateau (optionnel)" />
          </SelectTrigger>
          <SelectContent>
            {boats?.map((boat) => (
              <SelectItem key={boat.id} value={boat.id}>
                {boat.name} - {boat.model} ({boat.status === 'available' ? 'Disponible' : boat.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBoatId && boats?.find((b) => b.id === selectedBoatId)?.status !== 'available' && (
          <p className="text-sm text-orange-600">
            Ce bateau n'est pas disponible. La fiche sera en attente d'assignation.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date de début *</Label>
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
                onSelect={setStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Date de fin *</Label>
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
                onSelect={setEndDate}
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
          placeholder="Notes concernant la location..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Instructions spéciales</Label>
        <Textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="Instructions spéciales pour le check-in..."
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Création...' : 'Créer la fiche'}
      </Button>
    </form>
  );
}
