import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StockItem } from '@/types';

export interface StockProductLevel extends StockItem {
  productId: string;
}

export interface StockProduct {
  productId: string;
  name: string;
  reference: string;
  category: string;
  unit: string;
  brand?: string;
  barcode?: string;
  photoUrl?: string;
  levels: StockProductLevel[];
  totalQuantity: number;
  totalThreshold: number;
}

const GLOBAL_ROLES = ['direction', 'administratif'];

export const isGlobalStockRole = (role?: string) => GLOBAL_ROLES.includes(role || '');

/**
 * Aggregates per-base stock lines (stock_items) into a single product record
 * (stock_products). RLS keeps chef_base / technicien limited to their own base.
 */
export function useStockProducts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stock-products', user?.id, user?.role, user?.baseId],
    enabled: !!user?.id && (isGlobalStockRole(user?.role) || !!user?.baseId),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<StockProduct[]> => {
      const [{ data: items, error }, { data: bases }] = await Promise.all([
        supabase
          .from('stock_items')
          .select('*')
          .order('name', { ascending: true }),
        supabase.from('bases').select('id, name'),
      ]);

      if (error) throw error;

      const baseNames = new Map((bases || []).map((b: any) => [b.id, b.name]));
      const products = new Map<string, StockProduct>();

      (items || []).forEach((item: any) => {
        const productId = item.product_id || item.id;
        const level: StockProductLevel = {
          productId,
          id: item.id,
          name: item.name,
          reference: item.reference || '',
          barcode: item.barcode || '',
          brand: item.brand || '',
          supplierReference: item.supplier_reference || '',
          category: item.category || '',
          quantity: item.quantity || 0,
          minThreshold: item.min_threshold || 0,
          unit: item.unit || '',
          unitPrice: item.unit_price != null ? Number(item.unit_price) : undefined,
          location: item.location || '',
          baseId: item.base_id || '',
          baseName: baseNames.get(item.base_id) || '',
          photoUrl: item.photo_url || '',
          lastUpdated: item.last_updated || new Date().toISOString(),
          lastPurchaseDate: item.last_purchase_date || undefined,
          lastPurchaseCost: item.last_purchase_cost != null ? Number(item.last_purchase_cost) : undefined,
          lastSupplierId: item.last_supplier_id || undefined,
        };

        const existing = products.get(productId);
        if (existing) {
          existing.levels.push(level);
          existing.totalQuantity += level.quantity;
          existing.totalThreshold += level.minThreshold;
        } else {
          products.set(productId, {
            productId,
            name: item.name,
            reference: item.reference || '',
            category: item.category || '',
            unit: item.unit || '',
            brand: item.brand || '',
            barcode: item.barcode || '',
            photoUrl: item.photo_url || '',
            levels: [level],
            totalQuantity: level.quantity,
            totalThreshold: level.minThreshold,
          });
        }
      });

      return Array.from(products.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export interface StockPricingRow {
  product_id: string;
  stock_item_id: string;
  base_id: string;
  base_name: string | null;
  unit_price: number | null;
  supplier_reference: string | null;
  supplier_name: string | null;
  last_purchase_cost: number | null;
  last_purchase_date: string | null;
}

/**
 * Supplier & price rows for a product across every base — readable by all roles.
 */
export function useStockProductPricing(productId?: string) {
  return useQuery({
    queryKey: ['stock-product-pricing', productId],
    enabled: !!productId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<StockPricingRow[]> => {
      const { data, error } = await (supabase as any)
        .from('stock_product_pricing')
        .select('*')
        .eq('product_id', productId);
      if (error) throw error;
      return (data || []) as StockPricingRow[];
    },
  });
}
