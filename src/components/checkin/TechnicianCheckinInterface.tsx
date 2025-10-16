import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Anchor, Play } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckinDialog } from './CheckinDialog';
import { AdministrativeCheckinFormWithRelations } from '@/types/checkin';

export function TechnicianCheckinInterface() {
  const { user } = useAuth();
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<AdministrativeCheckinFormWithRelations | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch boats from user's base
  const { data: boats = [] } = useQuery({
    queryKey: ['boats', user?.baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('*')
        .eq('base_id', user?.baseId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId,
  });

  // Fetch ready forms for selected boat
  const { data: readyForms = [], isLoading } = useQuery({
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
    enabled: !!selectedBoatId && !!user?.baseId,
  });

  const handleStartCheckin = (form: AdministrativeCheckinFormWithRelations) => {
    setSelectedForm(form);
    setIsDialogOpen(true);
  };

  const handleCompleteCheckin = async (data: any) => {
    if (data && selectedForm) {
      // Mark form as used
      await supabase
        .from('administrative_checkin_forms')
        .update({
          status: 'used',
          used_by: user?.id,
          used_at: new Date().toISOString(),
        })
        .eq('id', selectedForm.id);
    }
    setIsDialogOpen(false);
    setSelectedForm(null);
  };

  return (
    <div className="space-y-6">
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
              {boats.map((boat) => (
                <SelectItem key={boat.id} value={boat.id}>
                  {boat.name} - {boat.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBoatId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Fiches clients disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-muted-foreground">Chargement...</p>
            )}

            {!isLoading && readyForms.length === 0 && (
              <p className="text-muted-foreground">
                Aucune fiche disponible pour ce bateau
              </p>
            )}

            {!isLoading && readyForms.length > 0 && (
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
          </CardContent>
        </Card>
      )}

      {selectedForm && (
        <CheckinDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedForm(null);
          }}
          boat={selectedForm.boat}
          rentalData={{
            customerName: `${selectedForm.customer.first_name} ${selectedForm.customer.last_name}`,
            customerEmail: selectedForm.customer.email,
            customerPhone: selectedForm.customer.phone,
            startDate: selectedForm.planned_start_date,
            endDate: selectedForm.planned_end_date,
            notes: selectedForm.rental_notes,
          }}
          onComplete={handleCompleteCheckin}
        />
      )}
    </div>
  );
}
