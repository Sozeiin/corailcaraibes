import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Anchor, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckinDialog } from './CheckinDialog';

export function TechnicianCheckoutInterface() {
  const { user } = useAuth();
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [selectedRental, setSelectedRental] = useState<any>(null);
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

  // Fetch active rentals for selected boat
  const { data: activeRentals = [], isLoading } = useQuery({
    queryKey: ['active-rentals-for-boat', selectedBoatId, user?.baseId],
    queryFn: async () => {
      if (!selectedBoatId) return [];

      const { data, error } = await supabase
        .from('boat_rentals')
        .select(`
          *,
          boat:boats!inner(id, name, model)
        `)
        .eq('boat_id', selectedBoatId)
        .eq('status', 'confirmed')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBoatId && !!user?.baseId,
  });

  const handleStartCheckout = (rental: any) => {
    setSelectedRental(rental);
    setIsDialogOpen(true);
  };

  const handleCompleteCheckout = async (data: any) => {
    if (data && selectedRental) {
      // Mark rental as completed
      await supabase
        .from('boat_rentals')
        .update({
          status: 'completed',
        })
        .eq('id', selectedRental.id);
    }
    setIsDialogOpen(false);
    setSelectedRental(null);
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
              Locations en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-muted-foreground">Chargement...</p>
            )}

            {!isLoading && activeRentals.length === 0 && (
              <p className="text-muted-foreground">
                Aucune location en cours pour ce bateau
              </p>
            )}

            {!isLoading && activeRentals.length > 0 && (
              <div className="grid gap-4">
                {activeRentals.map((rental) => (
                  <Card key={rental.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {rental.customer_name}
                            </h3>
                            <Badge variant="secondary">En cours</Badge>
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
                          variant="default"
                          className="ml-4"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
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

      {selectedRental && (
        <CheckinDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedRental(null);
          }}
          boat={selectedRental.boat}
          rentalData={{
            id: selectedRental.id,
            customerName: selectedRental.customer_name,
            customerEmail: selectedRental.customer_email,
            customerPhone: selectedRental.customer_phone,
            startDate: selectedRental.start_date,
            endDate: selectedRental.end_date,
            notes: selectedRental.notes,
          }}
          type="checkout"
          onComplete={handleCompleteCheckout}
        />
      )}
    </div>
  );
}
