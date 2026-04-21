import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, Anchor, Play, LogIn, LogOut, FileEdit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckinDialog } from './CheckinDialog';
import { AdministrativeCheckinFormWithRelations } from '@/types/checkin';
import { useNavigate } from 'react-router-dom';

export function TechnicianCheckinInterface() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<AdministrativeCheckinFormWithRelations | null>(null);
  const [selectedRental, setSelectedRental] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch existing drafts from Supabase
  const { data: drafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ['checkin-drafts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkin_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleDeleteDraft = async (formKey: string) => {
    await supabase.from('checkin_drafts').delete().eq('form_key', formKey);
    refetchDrafts();
    toast.success('Brouillon supprimé');
  };

  const handleResumeDraft = async (draft: any) => {
    const checklistType: 'checkin' | 'checkout' = draft.checklist_type === 'checkout' ? 'checkout' : 'checkin';

    try {
      // Fetch the full boat record so the checklist form has all required fields
      let boatData: any = { id: draft.boat_id, name: draft.boat_name || 'Bateau' };
      if (draft.boat_id) {
        const { data: boat } = await supabase
          .from('boats')
          .select('*')
          .eq('id', draft.boat_id)
          .maybeSingle();
        if (boat) boatData = boat;
      }

      // Build rental data: for check-out load the active rental, for check-in load the admin form
      let rentalData: any = { customerName: draft.customer_name || 'Client' };

      if (checklistType === 'checkout' && draft.boat_id) {
        const { data: rental } = await supabase
          .from('boat_rentals')
          .select('*, customer:customers(*)')
          .eq('boat_id', draft.boat_id)
          .eq('status', 'confirmed')
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (rental) {
          rentalData = {
            id: rental.id,
            boatId: rental.boat_id,
            customerName: rental.customer_name || draft.customer_name || 'Client',
            customerEmail: rental.customer_email || '',
            customerPhone: rental.customer_phone || '',
            startDate: rental.start_date,
            endDate: rental.end_date,
            totalAmount: rental.total_amount || 0,
            notes: rental.notes,
          };
        }
      } else if (checklistType === 'checkin' && draft.boat_id) {
        const { data: form } = await supabase
          .from('administrative_checkin_forms')
          .select('*, customer:customers(*)')
          .eq('boat_id', draft.boat_id)
          .eq('status', 'ready')
          .order('planned_start_date', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (form) {
          const customer: any = (form as any).customer;
          rentalData = {
            boatId: form.boat_id,
            customerName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : draft.customer_name || 'Client',
            customerEmail: customer?.email || '',
            customerPhone: customer?.phone || '',
            startDate: form.planned_start_date,
            endDate: form.planned_end_date,
            notes: form.rental_notes || form.special_instructions,
          };
        }
      }

      navigate('/checkin-process', {
        state: {
          boat: boatData,
          rentalData,
          type: checklistType,
        },
      });
    } catch (e) {
      console.error('Error resuming draft:', e);
      toast.error('Impossible de reprendre le brouillon');
    }
  };

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

  // Fetch boats with active rentals OR rented status (Check-out mode)
  const { data: boatsWithActiveRentals = [] } = useQuery({
    queryKey: ['boats-with-active-rentals', user?.baseId],
    queryFn: async () => {
      // Get boats owned by this base with confirmed rentals
      const { data: ownBoatsWithRentals, error: ownError } = await supabase
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

      // Also get boats with "rented" status but no confirmed rental (stuck boats)
      const { data: ownRentedBoats, error: rentedError } = await supabase
        .from('boats')
        .select('id, name, model, status')
        .eq('base_id', user?.baseId)
        .eq('status', 'rented')
        .order('name');

      if (rentedError) throw rentedError;

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

      // Combine all lists
      const allBoats = [
        ...(ownBoatsWithRentals || []),
        ...(ownRentedBoats || []),
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
      const { error: formError } = await supabase
        .from('administrative_checkin_forms')
        .update({
          status: 'used',
          used_by: user?.id,
          used_at: new Date().toISOString(),
        })
        .eq('id', selectedForm.id);

      if (formError) {
        console.error('Error updating form status:', formError);
      }

      // ONE WAY: transfer boat to destination base immediately at check-in (via SECURITY DEFINER RPC)
      if (selectedForm.is_one_way && selectedForm.destination_base_id && selectedForm.boat_id) {
        const { error: transferError } = await supabase.rpc('handle_one_way_checkin_transfer', {
          p_boat_id: selectedForm.boat_id,
          p_from_base_id: selectedForm.base_id,
          p_to_base_id: selectedForm.destination_base_id,
          p_transferred_by: user?.id || null,
        });

        if (transferError) {
          console.error('Error transferring boat for ONE WAY:', transferError);
          toast.error('Erreur lors du transfert ONE WAY du bateau vers la base de destination');
        } else {
          console.log('ONE WAY: boat transferred to destination base at check-in');
          toast.success('Bateau transféré vers la base de destination (ONE WAY) - en attente du check-out');
        }
      }
    } else if (mode === 'checkout' && data && selectedRental) {
      if (selectedRental.id === 'force-checkout') {
        // Force checkout: just update boat status to available
        const { error } = await supabase
          .from('boats')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .eq('id', selectedRental.boat_id);
        if (error) console.error('Error force-checkout boat:', error);
      } else {
        // Update rental status to completed
        const { error: rentalError } = await supabase
          .from('boat_rentals')
          .update({ status: 'completed' })
          .eq('id', selectedRental.id);
        if (rentalError) console.error('Error completing rental:', rentalError);

        // Find the associated administrative form by context
        const { data: formData } = await supabase
          .from('administrative_checkin_forms')
          .select('id, is_one_way, destination_base_id, boat_id, customer_id, planned_end_date')
          .eq('boat_id', selectedRental.boat_id)
          .eq('status', 'used')
          .gte('planned_end_date', new Date(selectedRental.start_date).toISOString())
          .lte('planned_start_date', new Date(selectedRental.end_date).toISOString())
          .order('used_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (formData) {
          // Update form status to completed
          const { error: formUpdateError } = await supabase
            .from('administrative_checkin_forms')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', formData.id);
          if (formUpdateError) console.error('Error completing form:', formUpdateError);
        }

        // Always set boat to available after checkout (base already transferred at check-in for ONE WAY)
        const { error: boatError } = await supabase
          .from('boats')
          .update({ 
            status: 'available' as any, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', selectedRental.boat_id);
        if (boatError) console.error('Error setting boat available:', boatError);
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
      {/* Brouillons en cours */}
      {drafts.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileEdit className="h-5 w-5" />
              Brouillons en cours ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{draft.boat_name || 'Bateau inconnu'}</span>
                      <Badge variant={draft.checklist_type === 'checkin' ? 'default' : 'secondary'}>
                        {draft.checklist_type === 'checkin' ? 'Check-in' : 'Check-out'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {draft.customer_name || 'Client non renseigné'} • 
                      Modifié {draft.updated_at ? format(new Date(draft.updated_at), " d MMM à HH:mm", { locale: fr }) : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" onClick={() => handleResumeDraft(draft)}>
                      <Play className="h-4 w-4 mr-1" />
                      Reprendre
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteDraft(draft.form_key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

              {!isLoading && items.length === 0 && mode === 'checkin' && (
                <p className="text-muted-foreground">
                  Aucune fiche disponible pour ce bateau
                </p>
              )}

              {!isLoading && items.length === 0 && mode === 'checkout' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Aucune location active pour ce bateau
                  </p>
                  {boats.find(b => b.id === selectedBoatId)?.status === 'rented' && (
                    <Card className="border-l-4 border-l-amber-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <h3 className="font-semibold text-lg">
                              Check-out sans location active
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Ce bateau est marqué "en location" mais n'a pas de location confirmée associée. 
                              Vous pouvez procéder au check-out pour le remettre en disponible.
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              const boat = boats.find(b => b.id === selectedBoatId);
                              if (boat) {
                                handleStartCheckout({
                                  id: 'force-checkout',
                                  boat_id: boat.id,
                                  boat: boat,
                                  customer_name: 'Client précédent',
                                  customer_email: null,
                                  customer_phone: null,
                                  start_date: new Date().toISOString(),
                                  end_date: new Date().toISOString(),
                                  notes: 'Check-out forcé - remise en disponibilité',
                                  status: 'confirmed',
                                });
                              }
                            }}
                            variant="destructive"
                            className="ml-4"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Démarrer check-out
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
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
