import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDeleteBoat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (boatId: string) => {
      console.log('🗑️ Suppression bateau:', boatId);
      
      const { error } = await supabase
        .from('boats')
        .delete()
        .eq('id', boatId);

      if (error) throw error;
      return boatId;
    },
    onSuccess: () => {
      // Invalider toutes les requêtes liées aux bateaux
      queryClient.invalidateQueries({ queryKey: ['boats'] });
      queryClient.invalidateQueries({ queryKey: ['boat-checklists'] });
      queryClient.invalidateQueries({ queryKey: ['boat-components'] });
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      
      toast({
        title: "Bateau supprimé",
        description: "Le bateau a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression bateau:', error);
      
      let errorMessage = "Impossible de supprimer le bateau.";
      if (error.code === '23503') {
        errorMessage = "Ce bateau est utilisé dans d'autres données et ne peut pas être supprimé.";
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

export function useDeleteIntervention() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (interventionId: string) => {
      console.log('🗑️ Suppression intervention:', interventionId);
      
      const { error } = await supabase
        .from('interventions')
        .delete()
        .eq('id', interventionId);

      if (error) throw error;
      return interventionId;
    },
    onSuccess: () => {
      // Invalider toutes les requêtes liées aux interventions
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-history'] });
      queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      
      toast({
        title: "Intervention supprimée",
        description: "L'intervention a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression intervention:', error);
      
      let errorMessage = "Impossible de supprimer l'intervention.";
      if (error.code === '23503') {
        errorMessage = "Cette intervention est liée à d'autres données et ne peut pas être supprimée.";
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