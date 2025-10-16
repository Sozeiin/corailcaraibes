import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Anchor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BoatRental {
  id: string;
  boat_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  boats: {
    name: string;
    model: string;
  };
}

interface CustomerHistoryProps {
  customerId: string;
}

export function CustomerHistory({ customerId }: CustomerHistoryProps) {
  const [rentals, setRentals] = useState<BoatRental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('boat_rentals')
        .select(`
          id,
          boat_id,
          start_date,
          end_date,
          total_amount,
          status,
          boats (
            name,
            model
          )
        `)
        .eq('customer_id', customerId)
        .order('start_date', { ascending: false });

      if (data) {
        setRentals(data as any);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [customerId]);

  if (loading) {
    return <div className="text-center p-4">Chargement...</div>;
  }

  if (rentals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucune location enregistrée
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des locations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rentals.map((rental) => (
          <div
            key={rental.id}
            className="flex items-start gap-4 p-4 rounded-lg border bg-card"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Anchor className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{rental.boats.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {rental.boats.model}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(rental.start_date), 'dd MMM yyyy', { locale: fr })}
                  {' → '}
                  {format(new Date(rental.end_date), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>

              {rental.total_amount > 0 && (
                <div className="mt-1 text-sm font-medium">
                  {rental.total_amount.toFixed(2)} €
                </div>
              )}
            </div>

            <Badge
              variant={rental.status === 'completed' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {rental.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
