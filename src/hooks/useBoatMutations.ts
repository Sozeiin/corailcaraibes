import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { invalidateBoatQueries, invalidateInterventionQueries } from '@/lib/queryInvalidation';

export function useDeleteBoat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boatId: string) => {
      console.log('🗑️ Suppression bateau:', boatId);
      
      const { data, error } = await supabase
        .rpc('delete_boat_cascade', { boat_id_param: boatId });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      invalidateBoatQueries(queryClient, data?.boat_id);
      toast.success("Bateau et toutes ses données supprimés avec succès");
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression bateau:', error);
      
      let errorMessage = "Impossible de supprimer le bateau.";
      
      if (error.message?.includes('Permission refusée')) {
        errorMessage = error.message;
      } else if (error.message?.includes('Bateau introuvable')) {
        errorMessage = 'Bateau introuvable.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    },
  });
}

export function useDeleteIntervention() {
  const queryClient = useQueryClient();

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
      
      invalidateInterventionQueries(queryClient);
      toast.success("Intervention supprimée avec succès");
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression intervention:', error);
      
      let errorMessage = "Impossible de supprimer l'intervention.";
      if (error.code === '23503') {
        errorMessage = "Cette intervention est liée à d'autres données et ne peut pas être supprimée.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires.";
      }
      
      toast.error(`Erreur: ${errorMessage}`);
    },
  });
}