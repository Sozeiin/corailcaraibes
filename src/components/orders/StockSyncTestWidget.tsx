import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export function StockSyncTestWidget() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const testStockSync = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      // Vérifier les commandes livrées sans stock_item_id
      const { data: unlinkedOrders, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status,
          order_items(id, product_name, stock_item_id, quantity)
        `)
        .eq('status', 'delivered');

      if (error) throw error;

      const problematicOrders = unlinkedOrders?.filter(order => 
        order.order_items?.some((item: any) => !item.stock_item_id)
      ) || [];

      if (problematicOrders.length === 0) {
        toast({
          title: "✅ Synchronisation OK",
          description: "Toutes les commandes livrées sont synchronisées avec le stock."
        });
        setResults([{ 
          status: 'success', 
          message: 'Toutes les commandes livrées sont synchronisées !' 
        }]);
        return;
      }

      // Forcer la synchronisation pour les commandes problématiques
      for (const order of problematicOrders) {
        try {
          // Simuler une mise à jour pour déclencher le trigger
          const deliveryDate = new Date().toISOString().split('T')[0];
          await supabase
            .from('orders')
            .update({ delivery_date: deliveryDate })
            .eq('id', order.id);

          setResults(prev => [...prev, {
            status: 'success',
            message: `Commande ${order.order_number} synchronisée`
          }]);
        } catch (err) {
          setResults(prev => [...prev, {
            status: 'error',
            message: `Erreur commande ${order.order_number}: ${err}`
          }]);
        }
      }

      toast({
        title: "🔄 Synchronisation terminée",
        description: `${problematicOrders.length} commande(s) traitée(s)`
      });

    } catch (error) {
      console.error('Erreur test sync:', error);
      toast({
        title: "Erreur",
        description: "Impossible de tester la synchronisation",
        variant: "destructive"
      });
      setResults([{ 
        status: 'error', 
        message: `Erreur: ${error}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Test Synchronisation Stock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Ce widget vérifie et force la synchronisation entre les commandes livrées et le stock.
        </p>
        
        <Button 
          onClick={testStockSync} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          {isLoading ? 'Test en cours...' : 'Tester la synchronisation'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <h4 className="font-medium text-sm">Résultats :</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {result.status === 'success' ? (
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-700 border-red-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Erreur
                  </Badge>
                )}
                <span>{result.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}