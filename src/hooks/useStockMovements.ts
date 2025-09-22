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
      // Récupérer d'abord les mouvements de stock
      let movementsQuery = supabase
        .from('stock_movements')
        .select('*')
        .eq('movement_type', 'outbound_distribution')
        .order('ts', { ascending: false });

      // Filtrer par fournisseur si fourni
      if (supplierId) {
        movementsQuery = movementsQuery.ilike('notes', `%${supplierId}%`);
      }

      const { data: movements, error: movementsError } = await movementsQuery;
      if (movementsError) throw movementsError;

      if (!movements || movements.length === 0) {
        return [];
      }

      // Récupérer les informations des articles de stock
      const stockItemIds = movements.map(m => m.sku);
      const { data: stockItems, error: stockError } = await supabase
        .from('stock_items')
        .select('id, name, reference, unit')
        .in('id', stockItemIds);

      if (stockError) throw stockError;

      // Récupérer les informations des utilisateurs
      const userIds = movements.map(m => m.actor).filter(Boolean);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Joindre les données
      return movements.map(movement => ({
        ...movement,
        stock_items: stockItems?.find(item => item.id === movement.sku) || null,
        profiles: profiles?.find(profile => profile.id === movement.actor) || null
      }));
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