import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateString } from '@/lib/dateUtils';

export interface StockProductPrice {
  id: string;
  product_id: string;
  base_id: string | null;
  base_name?: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_reference: string | null;
  unit_price: number;
  currency: string;
  minimum_quantity: number;
  price_date: string;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface NewStockProductPrice {
  productId: string;
  baseId: string | null;
  supplierId: string | null;
  supplierReference?: string;
  unitPrice: number;
  minimumQuantity?: number;
  priceDate?: string;
  notes?: string;
}

/** Tarifs saisis manuellement sur une fiche produit — visibles par tous les rôles. */
export function useStockProductPrices(productId?: string) {
  return useQuery({
    queryKey: ['stock-product-prices', productId],
    enabled: !!productId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<StockProductPrice[]> => {
      const [{ data, error }, { data: bases }] = await Promise.all([
        (supabase as any)
          .from('stock_product_prices')
          .select('*')
          .eq('product_id', productId)
          .order('price_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('bases').select('id, name'),
      ]);
      if (error) throw error;

      const baseNames = new Map((bases || []).map((b: any) => [b.id, b.name]));
      return ((data || []) as any[]).map((row) => ({
        ...row,
        unit_price: Number(row.unit_price),
        base_name: row.base_id ? baseNames.get(row.base_id) || null : null,
      })) as StockProductPrice[];
    },
  });
}

export function useAddStockProductPrice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: NewStockProductPrice) => {
      let supplierName: string | null = null;
      if (input.supplierId) {
        const { data } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', input.supplierId)
          .maybeSingle();
        supplierName = data?.name || null;
      }

      const { error } = await (supabase as any).from('stock_product_prices').insert({
        product_id: input.productId,
        base_id: input.baseId,
        supplier_id: input.supplierId,
        supplier_name: supplierName,
        supplier_reference: input.supplierReference || null,
        unit_price: input.unitPrice,
        minimum_quantity: input.minimumQuantity ?? 1,
        price_date: input.priceDate || getLocalDateString(),
        notes: input.notes || null,
        created_by: user?.id || null,
        created_by_name: user?.name || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-product-prices', variables.productId] });
    },
  });
}
