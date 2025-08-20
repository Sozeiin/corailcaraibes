import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';

interface SyncButtonProps {
  orderId?: string;
  orderNumber?: string;
  onSyncComplete?: () => void;
}

export function SyncButton({ orderId, orderNumber, onSyncComplete }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!orderId) return;
    
    setIsSyncing(true);
    try {
      // Forcer la synchronisation en mettant à jour le statut vers 'delivered'
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "✅ Synchronisation réussie",
        description: `La commande ${orderNumber} a été synchronisée avec le stock.`,
      });

      onSyncComplete?.();
    } catch (error) {
      console.error('Erreur sync:', error);
      toast({
        title: "❌ Erreur de synchronisation",
        description: "Impossible de synchroniser la commande.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Sync...' : 'Forcer sync'}
    </Button>
  );
}