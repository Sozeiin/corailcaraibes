import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle } from 'lucide-react';

export function BulkSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [results, setResults] = useState<{ synced: number; errors: number } | null>(null);
  const { toast } = useToast();

  const handleBulkSync = async () => {
    setIsSyncing(true);
    setResults(null);
    
    try {
      // Récupérer toutes les commandes livrées avec des items non liés au stock
      const { data: ordersToSync, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id, order_number, status,
          order_items(id, stock_item_id)
        `)
        .in('status', ['delivered', 'confirmed']);

      if (fetchError) throw fetchError;

      // Filtrer celles qui ont des items non synchronisés
      const unsyncedOrders = ordersToSync?.filter(order => 
        order.order_items?.some((item: any) => !item.stock_item_id)
      ) || [];

      if (unsyncedOrders.length === 0) {
        toast({
          title: "✅ Toutes les commandes sont synchronisées",
          description: "Aucune commande à synchroniser.",
        });
        setResults({ synced: 0, errors: 0 });
        return;
      }

      let synced = 0;
      let errors = 0;

      // Forcer la synchronisation pour chaque commande
      for (const order of unsyncedOrders) {
        try {
          await supabase
            .from('orders')
            .update({ 
              status: 'delivered',
              delivery_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', order.id);
          
          synced++;
        } catch (err) {
          console.error(`Erreur sync commande ${order.order_number}:`, err);
          errors++;
        }
      }

      setResults({ synced, errors });

      if (errors === 0) {
        toast({
          title: "✅ Synchronisation réussie",
          description: `${synced} commande(s) synchronisée(s) avec le stock.`,
        });
      } else {
        toast({
          title: "⚠️ Synchronisation partielle",
          description: `${synced} commande(s) synchronisée(s), ${errors} erreur(s).`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Erreur bulk sync:', error);
      toast({
        title: "❌ Erreur de synchronisation",
        description: "Impossible de synchroniser les commandes.",
        variant: "destructive"
      });
      setResults({ synced: 0, errors: 1 });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <RefreshCw className="w-5 h-5" />
          Synchronisation des commandes existantes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-700">
          Forcez la synchronisation des commandes livrées qui n'ont pas encore été intégrées au stock.
        </p>
        
        <Button
          onClick={handleBulkSync}
          disabled={isSyncing}
          variant="outline"
          className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronisation en cours...' : 'Synchroniser toutes les commandes'}
        </Button>

        {results && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-700">
              {results.synced} commande(s) synchronisée(s)
              {results.errors > 0 && `, ${results.errors} erreur(s)`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}