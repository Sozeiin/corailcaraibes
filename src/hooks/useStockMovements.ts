import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StockMovement {
  id: string;
  sku: string;
  qty: number;
  movement_type: string;
  base_id: string;
  actor: string | null;
  notes: string | null;
  ts: string;
  supplier_id?: string | null;
  stock_items?: {
    name: string;
    reference: string;
    unit: string;
  };
  profiles?: {
    name: string;
  };
}

export function useStockMovements(supplierId?: string) {
  const { user } = useAuth();
  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;

  return useQuery({
    queryKey: ['stock-movements', supplierId, baseId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          stock_items!sku (
            name,
            reference,
            unit
          ),
          profiles:actor (
            name
          )
        `)
        .order('ts', { ascending: false });

      // Pour filtrer par fournisseur, on utilisera les notes pour identifier les sorties fournisseurs
      if (supplierId) {
        query = query.ilike('notes', `%${supplierId}%`);
      }

      if (baseId) {
        query = query.eq('base_id', baseId);
      }

      // Filtrer uniquement les sorties de stock (outbound_distribution)
      query = query.eq('movement_type', 'outbound_distribution');

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user
  });
}

export function useSupplierStockMovements(supplierId: string) {
  return useStockMovements(supplierId);
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (movement: {
      sku: string;
      qty: number;
      supplier_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          sku: movement.sku,
          qty: -Math.abs(movement.qty), // Toujours négatif pour une sortie
          movement_type: 'outbound_distribution',
          base_id: user?.baseId,
          actor: user?.id,
          notes: movement.supplier_id ? 
            `Sortie vers fournisseur:${movement.supplier_id}. ${movement.notes || ''}`.trim() : 
            movement.notes || null,
          ts: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Mouvement de stock enregistré');
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création du mouvement:', error);
      toast.error('Erreur lors de l\'enregistrement du mouvement');
    }
  });
}