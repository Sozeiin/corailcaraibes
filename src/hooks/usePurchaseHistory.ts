import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PurchaseHistoryItem {
  id: string;
  purchase_date: string;
  unit_cost: number;
  quantity: number;
  total_cost: number;
  warranty_months: number;
  invoice_reference?: string;
  notes?: string;
  supplier?: {
    name: string;
    id: string;
  };
  order?: {
    order_number: string;
    id: string;
  };
}

export function usePurchaseHistory(stockItemId?: string) {
  return useQuery({
    queryKey: ['purchase-history', stockItemId],
    queryFn: async () => {
      if (!stockItemId) return [];

      const { data, error } = await supabase
        .from('component_purchase_history')
        .select(`
          id,
          purchase_date,
          unit_cost,
          quantity,
          total_cost,
          warranty_months,
          invoice_reference,
          notes,
          supplier:suppliers(id, name),
          order:orders(id, order_number)
        `)
        .eq('stock_item_id', stockItemId)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      return data as PurchaseHistoryItem[];
    },
    enabled: !!stockItemId,
  });
}