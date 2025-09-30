import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { invalidateSupplierQueries, invalidateOrderQueries } from '@/lib/queryInvalidation';

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      console.log('🗑️ Suppression fournisseur:', supplierId);
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;
      return supplierId;
    },
    onSuccess: () => {
      invalidateSupplierQueries(queryClient);
      toast.success("Fournisseur supprimé avec succès");
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression fournisseur:', error);
      
      let errorMessage = "Impossible de supprimer le fournisseur.";
      if (error.code === '23503') {
        errorMessage = "Ce fournisseur est utilisé dans d'autres données et ne peut pas être supprimé.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires.";
      }
      
      toast.error(`Erreur: ${errorMessage}`);
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      console.log('🗑️ Suppression commande:', orderId);
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      return orderId;
    },
    onSuccess: () => {
      // Invalider toutes les requêtes liées aux commandes
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-items'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-workflow-steps'] });
      
      invalidateOrderQueries(queryClient);
      toast.success("Commande supprimée avec succès");
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression commande:', error);
      
      let errorMessage = "Impossible de supprimer la commande.";
      if (error.code === '23503') {
        errorMessage = "Cette commande est liée à d'autres données et ne peut pas être supprimée.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires.";
      }
      
      toast.error(`Erreur: ${errorMessage}`);
    },
  });
}