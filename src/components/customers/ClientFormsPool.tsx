import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, AlertCircle, Anchor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export function ClientFormsPool() {
  const { user } = useAuth();
  const [loadingAssign, setLoadingAssign] = useState<string | null>(null);

  const { data: poolForms = [], refetch } = useQuery({
    queryKey: ['client-forms-pool', user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];

      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .select(`
          *,
          customer:customers(first_name, last_name, email, phone, vip_status),
          suggested_boat:boats!suggested_boat_id(id, name, model, status)
        `)
        .eq('base_id', user.baseId)
        .eq('is_boat_assigned', false)
        .order('planned_start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId,
  });

  const handleAssignBoat = async (formId: string, boatId: string) => {
    setLoadingAssign(formId);
    try {
      const { error } = await supabase
        .from('administrative_checkin_forms')
        .update({
          boat_id: boatId,
          is_boat_assigned: true,
          status: 'ready',
        })
        .eq('id', formId);

      if (error) throw error;

      toast.success('Fiche assignée au bateau');
      refetch();
    } catch (error: any) {
      console.error('Error assigning boat:', error);
      toast.error(error.message || 'Impossible d\'assigner le bateau');
    } finally {
      setLoadingAssign(null);
    }
  };

  const getDateBadge = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive">En retard</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-orange-500">Aujourd'hui</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-blue-500">Demain</Badge>;
    }
    return null;
  };

  if (poolForms.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucune fiche client en attente d'assignation
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Pool de fiches clients ({poolForms.length})
        </CardTitle>
      </CardHeader>

      {poolForms.map((form: any) => {
        const customer = form.customer;
        const suggestedBoat = form.suggested_boat;

        return (
          <Card key={form.id} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      {customer ? `${customer.first_name} ${customer.last_name}` : form.customer_name}
                    </span>
                    {customer?.vip_status && (
                      <Badge variant="default" className="bg-yellow-500">
                        VIP
                      </Badge>
                    )}
                  </div>

                  {customer && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {customer.email && <div>📧 {customer.email}</div>}
                      {customer.phone && <div>📞 {customer.phone}</div>}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {form.planned_start_date &&
                          format(new Date(form.planned_start_date), 'dd MMM', { locale: fr })}
                        {' → '}
                        {form.planned_end_date &&
                          format(new Date(form.planned_end_date), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    {getDateBadge(form.planned_start_date)}
                  </div>

                  {suggestedBoat && (
                    <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      <Anchor className="h-4 w-4 text-primary" />
                      <span className="font-medium">Bateau suggéré:</span>
                      <span>
                        {suggestedBoat.name} - {suggestedBoat.model}
                      </span>
                      <Badge variant={suggestedBoat.status === 'available' ? 'default' : 'secondary'}>
                        {suggestedBoat.status}
                      </Badge>
                    </div>
                  )}

                  {form.rental_notes && (
                    <div className="text-sm text-muted-foreground">
                      💬 {form.rental_notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {suggestedBoat && suggestedBoat.status === 'available' && (
                    <Button
                      size="sm"
                      onClick={() => handleAssignBoat(form.id, suggestedBoat.id)}
                      disabled={loadingAssign === form.id}
                    >
                      {loadingAssign === form.id ? 'Assignation...' : 'Assigner maintenant'}
                    </Button>
                  )}
                  {suggestedBoat && suggestedBoat.status !== 'available' && (
                    <div className="flex items-center gap-1 text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Bateau non disponible</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
