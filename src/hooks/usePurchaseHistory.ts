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

      // Récupérer d'abord l'historique d'achat
      const { data: purchaseHistory, error: purchaseError } = await supabase
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
          supplier_id,
          order_id
        `)
        .eq('stock_item_id', stockItemId)
        .order('purchase_date', { ascending: false });

      if (purchaseError) throw purchaseError;
      if (!purchaseHistory || purchaseHistory.length === 0) {
        return [];
      }

      // Récupérer les informations des fournisseurs
      const supplierIds = purchaseHistory
        .map(p => p.supplier_id)
        .filter(Boolean);
      
      let suppliers: any[] = [];
      if (supplierIds.length > 0) {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from('suppliers')
          .select('id, name')
          .in('id', supplierIds);
        
        if (suppliersError) throw suppliersError;
        suppliers = suppliersData || [];
      }

      // Récupérer les informations des commandes
      const orderIds = purchaseHistory
        .map(p => p.order_id)
        .filter(Boolean);
      
      let orders: any[] = [];
      if (orderIds.length > 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number')
          .in('id', orderIds);
        
        if (ordersError) throw ordersError;
        orders = ordersData || [];
      }

      // Joindre manuellement les données
      return purchaseHistory.map(purchase => ({
        ...purchase,
        supplier: purchase.supplier_id 
          ? suppliers.find(s => s.id === purchase.supplier_id) || null
          : null,
        order: purchase.order_id 
          ? orders.find(o => o.id === purchase.order_id) || null
          : null
      })) as PurchaseHistoryItem[];
    },
    enabled: !!stockItemId,
  });
}