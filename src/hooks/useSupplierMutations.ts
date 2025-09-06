import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      // Invalider toutes les requêtes liées aux fournisseurs
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['stock-item-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-history'] });
      
      toast({
        title: "Fournisseur supprimé",
        description: "Le fournisseur a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression fournisseur:', error);
      
      let errorMessage = "Impossible de supprimer le fournisseur.";
      if (error.code === '23503') {
        errorMessage = "Ce fournisseur est utilisé dans d'autres données et ne peut pas être supprimé.";
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

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      
      toast({
        title: "Commande supprimée",
        description: "La commande a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression commande:', error);
      
      let errorMessage = "Impossible de supprimer la commande.";
      if (error.code === '23503') {
        errorMessage = "Cette commande est liée à d'autres données et ne peut pas être supprimée.";
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