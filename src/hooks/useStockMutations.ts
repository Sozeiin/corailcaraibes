import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDeleteStockItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock_items'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-history'] });
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['component-purchase-history'] });
      
      toast({
        title: "Article supprimé",
        description: "L'article a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression article:', error);
      
      let errorMessage = "Impossible de supprimer l'article.";
      if (error.code === '23503') {
        errorMessage = "Cet article est utilisé dans d'autres données et ne peut pas être supprimé.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires.";
      }
      
      toast({
        title: "Erreur de suppression",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateStockQuantity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la quantité.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
    },
  });
}