import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useUpdateOilChangeInterval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ componentId, interval }: { componentId: string; interval: number }) => {
      const { data, error } = await supabase
        .from('boat_components')
        .update({
          oil_change_interval_hours: interval,
          updated_at: new Date().toISOString(),
        })
        .eq('id', componentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating oil change interval:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oil-change-intervals'] });
      queryClient.invalidateQueries({ queryKey: ['boat-engines'] });
      queryClient.invalidateQueries({ queryKey: ['boat-components'] });
      queryClient.invalidateQueries({ queryKey: ['boats'] });
      queryClient.invalidateQueries({ queryKey: ['boat-dashboard'] });
      toast.success('Intervalle de vidange mis à jour');
    },
    onError: () => {
      toast.error('Impossible de mettre à jour l\'intervalle. Veuillez réessayer.');
    },
  });
};
