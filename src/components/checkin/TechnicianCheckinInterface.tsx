import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, Anchor, Play, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckinDialog } from './CheckinDialog';
import { AdministrativeCheckinFormWithRelations } from '@/types/checkin';

export function TechnicianCheckinInterface() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<AdministrativeCheckinFormWithRelations | null>(null);
  const [selectedRental, setSelectedRental] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch boats with ready forms (Check-in mode)
  const { data: boatsWithReadyForms = [] } = useQuery({
    queryKey: ['boats-with-ready-forms', user?.baseId],
    queryFn: async () => {
      // Récupérer les fiches ready avec leurs bateaux
      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .select(`
          id,
          boat_id,
          boats!administrative_checkin_forms_boat_id_fkey (
            id,
            name,
            model,
            status
          )
        `)
        .eq('base_id', user?.baseId)
        .eq('status', 'ready')
        .not('boat_id', 'is', null);

      if (error) {
        console.error('Error fetching ready forms:', error);
        throw error;
      }

      // Extraire les bateaux uniques
      const boatsMap = new Map();
      data?.forEach(form => {
        if (form.boats && !boatsMap.has(form.boats.id)) {
          boatsMap.set(form.boats.id, form.boats);
        }
      });

      const uniqueBoats = Array.from(boatsMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );

      console.log('Boats with ready forms:', uniqueBoats);
      return uniqueBoats;
    },
    enabled: !!user?.baseId && mode === 'checkin',
  });

  // Fetch boats with active rentals (Check-out mode)
  const { data: boatsWithActiveRentals = [] } = useQuery({
    queryKey: ['boats-with-active-rentals', user?.baseId],
    queryFn: async () => {
      // Get boats owned by this base
      const { data: ownBoats, error: ownError } = await supabase
        .from('boats')
        .select(`
          id,
          name,
          model,
          status,
          boat_rentals!inner(id)
        `)
        .eq('base_id', user?.baseId)
        .eq('boat_rentals.status', 'confirmed')
        .order('name');

      if (ownError) throw ownError;

      // Get boats shared with this base (ONE WAY boats)
      const { data: sharedBoats, error: sharedError } = await supabase
        .from('boat_sharing')
        .select(`
          boat_id,
          boats!inner(
            id,
            name,
            model,
            status,
            boat_rentals!inner(id)
          )
        `)
        .eq('shared_with_base_id', user?.baseId)
        .eq('status', 'active')
        .eq('boats.boat_rentals.status', 'confirmed');

      if (sharedError) throw sharedError;

      // Combine both lists
      const allBoats = [
        ...(ownBoats || []),
        ...(sharedBoats?.map(sb => sb.boats).filter(Boolean) || [])
      ];
      
      // Dédupliquer les bateaux
      const uniqueBoats = Array.from(
        new Map(allBoats.map(boat => [boat.id, boat])).values()
      );
      
      return uniqueBoats || [];
    },
    enabled: !!user?.baseId && mode === 'checkout',
  });

  // Liste des bateaux selon le mode
  const boats = mode === 'checkin' ? boatsWithReadyForms : boatsWithActiveRentals;

  // Fetch ready forms for selected boat (Check-in mode)
  const { data: readyForms = [], isLoading: isLoadingForms } = useQuery({
    queryKey: ['ready-forms-for-boat', selectedBoatId, user?.baseId],
    queryFn: async () => {
      if (!selectedBoatId) return [];

      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .select('*')
        .eq('boat_id', selectedBoatId)
        .eq('status', 'ready')
        .eq('base_id', user?.baseId)
        .order('planned_start_date', { ascending: true });

      if (error) throw error;

      // Fetch related data
      const formsWithRelations = await Promise.all(
        (data || []).map(async (form) => {
          const [customerData, boatData] = await Promise.all([
            supabase.from('customers').select('*').eq('id', form.customer_id).single(),
            supabase.from('boats').select('*').eq('id', form.boat_id).single(),
          ]);

          return {
            ...form,
            customer: customerData.data!,
            boat: boatData.data!,
          };
        })
      );

      return formsWithRelations as AdministrativeCheckinFormWithRelations[];
    },
    enabled: !!selectedBoatId && !!user?.baseId && mode === 'checkin',
  });

  // Fetch active rentals for selected boat (Check-out mode)
  const { data: activeRentals = [], isLoading: isLoadingRentals } = useQuery({
    queryKey: ['active-rentals-for-boat', selectedBoatId, user?.baseId],
    queryFn: async () => {
      if (!selectedBoatId) return [];

      const { data, error } = await supabase
        .from('boat_rentals')
        .select('*, boat:boats(*), customer:customers(*)')
        .eq('boat_id', selectedBoatId)
        .eq('status', 'confirmed')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBoatId && !!user?.baseId && mode === 'checkout',
  });

  const handleStartCheckin = (form: AdministrativeCheckinFormWithRelations) => {
    setSelectedForm(form);
    setSelectedRental(null);
    setIsDialogOpen(true);
  };

  const handleStartCheckout = (rental: any) => {
    setSelectedRental(rental);
    setSelectedForm(null);
    setIsDialogOpen(true);
  };

  const handleComplete = async (data: any) => {
    if (mode === 'checkin' && data && selectedForm) {
      // Mark form as used
      await supabase
        .from('administrative_checkin_forms')
        .update({
          status: 'used',
          used_by: user?.id,
          used_at: new Date().toISOString(),
        })
        .eq('id', selectedForm.id);
    } else if (mode === 'checkout' && data && selectedRental) {
      // Update rental status to completed
      await supabase
        .from('boat_rentals')
        .update({ status: 'completed' })
        .eq('id', selectedRental.id);

      // Check if this is a ONE WAY checkout
      const { data: formData } = await supabase
        .from('administrative_checkin_forms')
        .select('id, is_one_way, destination_base_id, boat_id, customer_id, planned_end_date')
        .eq('id', selectedForm?.id || '')
        .maybeSingle();

      if (formData?.is_one_way && formData.destination_base_id && formData.boat_id) {
        // Create planning activity for destination base
        await supabase
          .from('planning_activities')
          .insert({
            activity_type: 'arrival',
            status: 'planned',
            scheduled_start: formData.planned_end_date,
            scheduled_end: formData.planned_end_date,
            base_id: formData.destination_base_id,
            boat_id: formData.boat_id
          } as any);
      }
    }
    setIsDialogOpen(false);
    setSelectedForm(null);
    setSelectedRental(null);
  };

  const isLoading = mode === 'checkin' ? isLoadingForms : isLoadingRentals;
  const items = mode === 'checkin' ? readyForms : activeRentals;

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(value) => {
        setMode(value as 'checkin' | 'checkout');
        setSelectedBoatId(''); // Réinitialiser la sélection lors du changement de mode
      }}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="checkin" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Check-in
          </TabsTrigger>
          <TabsTrigger value="checkout" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Check-out
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Anchor className="h-5 w-5" />
              Sélectionner un bateau
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un bateau..." />
              </SelectTrigger>
              <SelectContent>
                {boats.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {mode === 'checkin' 
                      ? 'Aucun bateau avec des fiches prêtes' 
                      : 'Aucun bateau avec des locations actives'}
                  </div>
                ) : (
                  boats.map((boat) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.name} - {boat.model}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedBoatId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {mode === 'checkin' ? 'Fiches clients disponibles' : 'Locations actives'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <p className="text-muted-foreground">Chargement...</p>
              )}

              {!isLoading && items.length === 0 && (
                <p className="text-muted-foreground">
                  {mode === 'checkin' 
                    ? 'Aucune fiche disponible pour ce bateau' 
                    : 'Aucune location active pour ce bateau'}
                </p>
              )}

              {!isLoading && items.length > 0 && mode === 'checkin' && (
                <div className="grid gap-4">
                  {readyForms.map((form) => (
                    <Card key={form.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">
                                {form.customer.first_name} {form.customer.last_name}
                              </h3>
                              {form.customer.vip_status && (
                                <Badge className="bg-yellow-500">VIP</Badge>
                              )}
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                              {form.customer.email && (
                                <div>📧 {form.customer.email}</div>
                              )}
                              {form.customer.phone && (
                                <div>📞 {form.customer.phone}</div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(form.planned_start_date), 'dd MMM', { locale: fr })}
                                {' → '}
                                {format(new Date(form.planned_end_date), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>

                            {form.rental_notes && (
                              <div className="text-sm text-muted-foreground mt-2">
                                💬 {form.rental_notes}
                              </div>
                            )}

                            {form.special_instructions && (
                              <div className="text-sm text-amber-600 mt-2">
                                ⚠️ {form.special_instructions}
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => handleStartCheckin(form)}
                            className="ml-4"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Démarrer check-in
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isLoading && items.length > 0 && mode === 'checkout' && (
                <div className="grid gap-4">
                  {activeRentals.map((rental) => (
                    <Card key={rental.id} className="border-l-4 border-l-amber-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">
                                {rental.customer_name}
                              </h3>
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                              {rental.customer_email && (
                                <div>📧 {rental.customer_email}</div>
                              )}
                              {rental.customer_phone && (
                                <div>📞 {rental.customer_phone}</div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(rental.start_date), 'dd MMM', { locale: fr })}
                                {' → '}
                                {format(new Date(rental.end_date), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>

                            {rental.notes && (
                              <div className="text-sm text-muted-foreground mt-2">
                                💬 {rental.notes}
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => handleStartCheckout(rental)}
                            variant="destructive"
                            className="ml-4"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Démarrer check-out
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Tabs>

      {(selectedForm || selectedRental) && (
        <CheckinDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedForm(null);
            setSelectedRental(null);
          }}
          boat={selectedForm?.boat || selectedRental?.boat}
          rentalData={selectedForm ? {
            customerName: `${selectedForm.customer.first_name} ${selectedForm.customer.last_name}`,
            customerEmail: selectedForm.customer.email,
            customerPhone: selectedForm.customer.phone,
            startDate: selectedForm.planned_start_date,
            endDate: selectedForm.planned_end_date,
            notes: selectedForm.rental_notes,
          } : {
            customerName: selectedRental.customer_name,
            customerEmail: selectedRental.customer_email,
            customerPhone: selectedRental.customer_phone,
            startDate: selectedRental.start_date,
            endDate: selectedRental.end_date,
            notes: selectedRental.notes,
          }}
          type={mode}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
