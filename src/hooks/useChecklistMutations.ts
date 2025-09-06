import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (itemId: string) => {
      console.log('🗑️ Suppression élément checklist:', itemId);
      
      // Check usage first
      const { data: usageCheck, error: usageError } = await supabase
        .from('boat_checklist_items')
        .select('item_id')
        .eq('item_id', itemId);
      
      if (usageError) throw usageError;
      
      // Delete references first if they exist (cascade deletion)
      if (usageCheck && usageCheck.length > 0) {
        console.log(`Suppression des ${usageCheck.length} références...`);
        
        const { error: deleteReferencesError } = await supabase
          .from('boat_checklist_items')
          .delete()
          .eq('item_id', itemId);

        if (deleteReferencesError) throw deleteReferencesError;
      }
      
      // Delete the checklist item
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      return itemId;
    },
    onSuccess: () => {
      // Invalider toutes les requêtes liées aux checklists
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['boat-checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      
      toast({
        title: "Élément supprimé",
        description: "L'élément de checklist a été supprimé avec succès."
      });
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression élément checklist:', error);
      
      let title = "Erreur de suppression";
      let description = "Impossible de supprimer l'élément.";
      
      if (error.code === '23503') {
        title = "Suppression impossible";
        description = "Cet élément est référencé dans d'autres données.";
      } else if (error.message?.includes('permission')) {
        title = "Permission refusée";
        description = "Vous n'avez pas les permissions nécessaires.";
      }
      
      toast({
        title,
        description,
        variant: "destructive"
      });
    },
  });
}