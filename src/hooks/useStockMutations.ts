import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { invalidateStockQueries } from '@/lib/queryInvalidation';

export function useDeleteStockItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      console.log('🗑️ Suppression article stock:', itemId);
      
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return itemId;
    },
    onSuccess: (itemId) => {
      // Invalider toutes les requêtes liées au stock
      invalidateStockQueries(queryClient);
      
      toast.success("Article supprimé avec succès");
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression article:', error);
      
      let errorMessage = "Impossible de supprimer l'article.";
      if (error.code === '23503') {
        errorMessage = "Cet article est utilisé dans d'autres données et ne peut pas être supprimé.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires.";
      }
      
      toast.error(`Erreur de suppression: ${errorMessage}`);
    },
  });
}

export function useUpdateStockQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      console.log('📦 Mise à jour quantité:', itemId, quantity);
      
      const { data, error } = await supabase
        .from('stock_items')
        .update({ 
          quantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ itemId, quantity }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['stock-items'] });
      
      const previousData = queryClient.getQueryData(['stock-items']);
      
      queryClient.setQueryData(['stock-items'], (old: any) => {
        if (!old) return old;
        return old.map((item: any) => 
          item.id === itemId ? { ...item, quantity } : item
        );
      });
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['stock-items'], context.previousData);
      }
      
      toast.error("Impossible de mettre à jour la quantité.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
    },
  });
}