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
import { Ship, User, Plus, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSecureTextInput, useSecureEmailInput, useSecurePhoneInput } from '@/hooks/useSecureInput';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface AdministrativeCheckinFormProps {
  boats: any[];
  onFormCreated: () => void;
}

export function AdministrativeCheckinForm({ boats, onFormCreated }: AdministrativeCheckinFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use secure input hooks for customer data
  const customerName = useSecureTextInput("", { required: true, maxLength: 100 });
  const customerEmail = useSecureEmailInput("", { required: false });
  const customerPhone = useSecurePhoneInput("", { required: false });

  // Get existing ready forms
  const { data: readyForms = [] } = useQuery({
    queryKey: ['administrative-checkin-forms', user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];
      
      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .select(`
          *,
          boats(name, model)
        `)
        .eq('base_id', user.baseId)
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId
  });

  const selectedBoat = boats.find(b => b.id === selectedBoatId);

  const isFormValid = selectedBoatId && customerName.value.trim() && startDate && endDate;

  const handleSubmit = async () => {
    if (!isFormValid || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('administrative_checkin_forms')
        .insert([{
          base_id: user.baseId,
          boat_id: selectedBoatId,
          customer_name: customerName.sanitizedValue,
          customer_email: customerEmail.sanitizedValue || null,
          customer_phone: customerPhone.sanitizedValue || null,
          planned_start_date: new Date(startDate).toISOString(),
          planned_end_date: new Date(endDate).toISOString(),
          rental_notes: notes || null,
          special_instructions: specialInstructions || null,
          created_by: user.id,
          status: 'ready'
        }]);

      if (error) throw error;

      toast({
        title: "Fiche client créé avec succès",
        description: "La fiche client a été créée et est prête pour le check-in technique.",
      });

      // Reset form
      setSelectedBoatId('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      setSpecialInstructions('');
      // Reset secure inputs by updating their values
      customerName.handleChange({ target: { value: '' } } as any);
      customerEmail.handleChange({ target: { value: '' } } as any);
      customerPhone.handleChange({ target: { value: '' } } as any);

      onFormCreated();
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la fiche client.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Ready Forms Display */}
      {readyForms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Fiches prêtes pour check-in technique ({readyForms.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {readyForms.map((form) => (
                <div key={form.id} className="p-4 border rounded-lg bg-green-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-green-800">{form.customer_name}</h4>
                      <p className="text-sm text-green-600">
                        Bateau: {form.boats?.name} - {form.boats?.model}
                      </p>
                      <p className="text-sm text-green-600">
                        Du {new Date(form.planned_start_date).toLocaleDateString()} au {new Date(form.planned_end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      Prête
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Form Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Créer une nouvelle fiche client
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Boat Selection */}
          <div>
            <Label htmlFor="boat">Bateau *</Label>
            <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bateau" />
              </SelectTrigger>
              <SelectContent>
                {boats.map((boat) => (
                  <SelectItem key={boat.id} value={boat.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{boat.name} - {boat.model}</span>
                      <Badge variant="default">Disponible</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBoat && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{selectedBoat.name}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>Modèle: {selectedBoat.model}</div>
                <div>Année: {selectedBoat.year}</div>
                <div>N° série: {selectedBoat.serial_number}</div>
                <div>Statut: <Badge variant="default">Disponible</Badge></div>
              </div>
            </div>
          )}

          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5" />
              <h3 className="text-lg font-medium">Informations client</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nom du client *</Label>
                <Input
                  id="customerName"
                  value={customerName.value}
                  onChange={customerName.handleChange}
                  placeholder="Nom complet"
                />
                {!customerName.value.trim() && (
                  <p className="text-sm text-destructive mt-1">Ce champ est requis</p>
                )}
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail.value}
                  onChange={customerEmail.handleChange}
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Téléphone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone.value}
                  onChange={customerPhone.handleChange}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Date de début *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Date de fin *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes de location</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes concernant la location..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="specialInstructions">Instructions spéciales</Label>
              <Textarea
                id="specialInstructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Instructions spéciales pour le technicien..."
                rows={2}
              />
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Création en cours...' : 'Créer la fiche client'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}