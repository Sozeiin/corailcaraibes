import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BoatRentalSelector } from './BoatRentalSelector';

interface TechnicianCheckinSelectorProps {
  boats: any[];
  onFormSelect: (data: { boat: any; rentalData: any }) => void;
  onManualCheckin: (boat: any, rentalData: any) => void;
}

export function TechnicianCheckinSelector({ boats, onFormSelect, onManualCheckin }: TechnicianCheckinSelectorProps) {
  const { user } = useAuth();
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [rentalData, setRentalData] = useState(null);

  // Get ready forms for technician
  const { data: readyForms = [], refetch } = useQuery({
    queryKey: ['ready-checkin-forms', user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];
      
      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .select(`
          *,
          boats(id, name, model, year)
        `)
        .eq('base_id', user.baseId)
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId
  });

  const handleFormSelect = async (form: any) => {
    try {
      // Mark form as used
      const { error } = await supabase
        .from('administrative_checkin_forms')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          used_by: user?.id
        })
        .eq('id', form.id);

      if (error) throw error;

      // Convert form to rental data format
      const rentalData = {
        boatId: form.boat_id,
        customerName: form.customer_name,
        customerEmail: form.customer_email,
        customerPhone: form.customer_phone,
        startDate: form.planned_start_date,
        endDate: form.planned_end_date,
        notes: form.rental_notes,
        specialInstructions: form.special_instructions,
        baseId: form.base_id,
        administrativeFormId: form.id,
        isValid: true
      };

      onFormSelect({
        boat: form.boats,
        rentalData
      });
    } catch (error) {
      console.error('Error using form:', error);
    }
  };

  const handleManualCheckinData = (data: any) => {
    setRentalData(data);
    if (selectedBoat && data?.isValid) {
      onManualCheckin(selectedBoat, data);
    }
  };

  if (showManualForm) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Check-in manuel</h2>
          <Button 
            variant="outline" 
            onClick={() => setShowManualForm(false)}
          >
            Retour aux fiches prêtes
          </Button>
        </div>
        <BoatRentalSelector
          type="checkin"
          mode="technician"
          onBoatSelect={setSelectedBoat}
          onRentalDataChange={handleManualCheckinData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Fiches prêtes pour check-in</h2>
          <p className="text-sm text-muted-foreground">
            Sélectionnez une fiche client préparée ou effectuez un check-in manuel
          </p>
        </div>
        <Button onClick={() => setShowManualForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Check-in manuel
        </Button>
      </div>

      {readyForms.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="mb-4">
              <User className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucune fiche prête</h3>
            <p className="text-muted-foreground mb-4">
              Aucune fiche client n'est disponible pour le check-in.
            </p>
            <Button onClick={() => setShowManualForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Effectuer un check-in manuel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {readyForms.map((form) => (
            <Card 
              key={form.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleFormSelect(form)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{form.customer_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Fiche prête pour check-in
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Prête
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bateau</p>
                    <p className="font-medium">{form.boats?.name} - {form.boats?.model}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact</p>
                    <p className="text-sm">{form.customer_email || 'Non renseigné'}</p>
                    <p className="text-sm">{form.customer_phone || 'Non renseigné'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Du {format(new Date(form.planned_start_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <span>→</span>
                  <span>
                    Au {format(new Date(form.planned_end_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>

                {form.special_instructions && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Instructions spéciales :</p>
                    <p className="text-sm text-blue-700">{form.special_instructions}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <Button className="w-full">
                    Commencer le check-in technique
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}