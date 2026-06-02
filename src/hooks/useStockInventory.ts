import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { invalidateStockQueries } from '@/lib/queryInvalidation';

export interface InventoryCountLine {
  stockItemId: string;
  itemName: string;
  itemReference: string | null;
  baseId: string;
  theoreticalQty: number;
  countedQty: number;
}

export function useValidateInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lines: InventoryCountLine[]) => {
      if (!lines.length) return { sessionId: null, count: 0 };

      const sessionId =
        (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // 1. Mettre à jour les quantités des articles comptés
      const nowIso = new Date().toISOString();
      for (const line of lines) {
        const { error: updateError } = await supabase
          .from('stock_items')
          .update({ quantity: line.countedQty, last_updated: nowIso })
          .eq('id', line.stockItemId);
        if (updateError) throw updateError;
      }

      // 2. Enregistrer l'historique des écarts
      const records = lines.map((line) => ({
        session_id: sessionId,
        stock_item_id: line.stockItemId,
        item_name: line.itemName,
        item_reference: line.itemReference,
        base_id: line.baseId,
        theoretical_qty: line.theoreticalQty,
        counted_qty: line.countedQty,
        difference: line.countedQty - line.theoreticalQty,
        actor: user?.id ?? null,
        actor_name: user?.name ?? null,
      }));

      const { error: insertError } = await supabase
        .from('stock_inventory_records')
        .insert(records);
      if (insertError) throw insertError;

      return { sessionId, count: lines.length };
    },
    onSuccess: ({ count }) => {
      invalidateStockQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['stock-inventory-records'] });
      toast.success(`Inventaire validé : ${count} article(s) mis à jour`);
    },
    onError: (error: any) => {
      console.error('Erreur lors de la validation de l\'inventaire:', error);
      toast.error('Erreur lors de la validation de l\'inventaire');
    },
  });
}
