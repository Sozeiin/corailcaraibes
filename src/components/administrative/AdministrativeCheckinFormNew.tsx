import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Ship, Plus, AlertCircle, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomerAutocomplete } from '@/components/customers/CustomerAutocomplete';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { Customer } from '@/types/customer';

interface AdministrativeCheckinFormNewProps {
  onFormCreated: () => void;
}

export function AdministrativeCheckinFormNew({ onFormCreated }: AdministrativeCheckinFormNewProps) {
  const { user } = useAuth();
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [suggestedBoatId, setSuggestedBoatId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [isOneWay, setIsOneWay] = useState(false);
  const [destinationBaseId, setDestinationBaseId] = useState<string>('');

  // Fetch all boats (not just available ones)
  const [boats, setBoats] = useState<any[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  React.useEffect(() => {
    const fetchBoatsAndBases = async () => {
      if (!user?.baseId) return;
      
      // Fetch boats
      const { data: boatsData } = await supabase
        .from('boats')
        .select('id, name, model, status')
        .eq('base_id', user.baseId)
        .order('name');
      
      if (boatsData) setBoats(boatsData);

      // Fetch all bases for ONE WAY destination
      const { data: basesData } = await supabase
        .from('bases')
        .select('id, name, location')
        .order('name');
      
      if (basesData) setBases(basesData);
    };

    fetchBoatsAndBases();
  }, [user?.baseId]);

  const suggestedBoat = boats.find(b => b.id === suggestedBoatId);

  const isFormValid = selectedCustomer && startDate && endDate;

  const handleSubmit = async () => {
    if (!isFormValid || !user) return;

    setIsSubmitting(true);
    try {
      // Determine if we can assign immediately
      const canAssignNow = suggestedBoatId && suggestedBoat?.status === 'available';

      const { error } = await supabase
        .from('administrative_checkin_forms')
        .insert([{
          base_id: user.baseId,
          customer_id: selectedCustomer.id,
          boat_id: canAssignNow ? suggestedBoatId : null,
          suggested_boat_id: suggestedBoatId || null,
          is_boat_assigned: canAssignNow,
          planned_start_date: new Date(startDate).toISOString(),
          planned_end_date: new Date(endDate).toISOString(),
          rental_notes: notes || null,
          special_instructions: specialInstructions || null,
          created_by: user.id,
          status: canAssignNow ? 'ready' : 'draft',
          is_one_way: isOneWay,
          destination_base_id: isOneWay ? destinationBaseId : null
        }]);

      if (error) throw error;

      if (canAssignNow) {
        toast.success('Fiche créée et assignée', {
          description: 'La fiche client est prête pour le check-in.',
        });
      } else {
        toast.success('Fiche créée dans le pool', {
          description: suggestedBoat ? 
            'La fiche sera assignée quand le bateau sera disponible.' :
            'La fiche attend qu\'un bateau lui soit assigné.',
        });
      }

      // Reset form
      setSelectedCustomer(null);
      setSuggestedBoatId('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      setSpecialInstructions('');
      setIsOneWay(false);
      setDestinationBaseId('');

      onFormCreated();
    } catch (error: any) {
      console.error('Error creating form:', error);
      toast.error('Erreur', {
        description: error.message || 'Impossible de créer la fiche client.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nouvelle fiche client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Selection */}
        <div className="space-y-2">
          <Label>Client *</Label>
          <CustomerAutocomplete
            value={selectedCustomer}
            onChange={setSelectedCustomer}
            placeholder="Rechercher ou créer un client..."
          />
          
          {selectedCustomer && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">Informations client</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomerDialog(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom:</span>
                  <p>{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                </div>
                {selectedCustomer.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p>{selectedCustomer.email}</p>
                  </div>
                )}
                {selectedCustomer.phone && (
                  <div>
                    <span className="text-muted-foreground">Téléphone:</span>
                    <p>{selectedCustomer.phone}</p>
                  </div>
                )}
                {selectedCustomer.vip_status && (
                  <div>
                    <Badge variant="default">VIP</Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Boat Suggestion (optional) */}
        <div className="space-y-2">
          <Label htmlFor="suggested_boat">Bateau suggéré (optionnel)</Label>
          <Select
            value={suggestedBoatId}
            onValueChange={setSuggestedBoatId}
          >
            <SelectTrigger id="suggested_boat">
              <SelectValue placeholder="Sélectionner un bateau (facultatif)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucun bateau suggéré</SelectItem>
              {boats.map((boat) => (
                <SelectItem key={boat.id} value={boat.id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span>{boat.name} - {boat.model}</span>
                    <Badge variant={boat.status === 'available' ? 'default' : 'secondary'} className="ml-2">
                      {boat.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {suggestedBoat && (
            <div className="p-3 border rounded-lg space-y-1">
              {suggestedBoat.status === 'available' ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Ship className="h-4 w-4" />
                  <span>✓ Bateau disponible - La fiche sera directement prête</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Bateau {suggestedBoat.status} - La fiche ira dans le pool</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Date de début *</Label>
            <Input
              type="date"
              id="start_date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">Date de fin *</Label>
            <Input
              type="date"
              id="end_date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes de location</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes sur la location..."
            rows={3}
          />
        </div>

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="special_instructions">Instructions spéciales</Label>
          <Textarea
            id="special_instructions"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Instructions spéciales pour le technicien..."
            rows={2}
          />
        </div>

        {/* ONE WAY Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_one_way"
              checked={isOneWay}
              onChange={(e) => {
                setIsOneWay(e.target.checked);
                if (!e.target.checked) setDestinationBaseId('');
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_one_way" className="font-medium cursor-pointer">
              Location ONE WAY (vers une autre base)
            </Label>
          </div>

          {isOneWay && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="destination_base">Base de destination *</Label>
              <Select
                value={destinationBaseId}
                onValueChange={setDestinationBaseId}
              >
                <SelectTrigger id="destination_base">
                  <SelectValue placeholder="Sélectionner la base de destination" />
                </SelectTrigger>
                <SelectContent>
                  {bases
                    .filter(base => base.id !== user?.baseId)
                    .map((base) => (
                      <SelectItem key={base.id} value={base.id}>
                        {base.name} - {base.location}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Le bateau sera partagé avec la base de destination pendant la période de location.
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Création...' : 'Créer la fiche'}
        </Button>
      </CardContent>
      
      {selectedCustomer && (
        <CustomerDialog
          open={showCustomerDialog}
          onOpenChange={setShowCustomerDialog}
          customer={selectedCustomer}
          onSuccess={() => {
            toast.success('Client modifié avec succès');
            setShowCustomerDialog(false);
          }}
        />
      )}
    </Card>
  );
}
