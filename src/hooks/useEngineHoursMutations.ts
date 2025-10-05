import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateEngineHoursData {
  current_engine_hours: number;
  last_oil_change_hours: number;
}

export const useUpdateEngineHours = (boatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ engineId, data }: { engineId: string; data: UpdateEngineHoursData }) => {
      const { data: updatedEngine, error } = await supabase
        .from('boat_components')
        .update({
          current_engine_hours: data.current_engine_hours,
          last_oil_change_hours: data.last_oil_change_hours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', engineId)
        .select()
        .single();

      if (error) {
        console.error('Error updating engine hours:', error);
        throw error;
      }

      return updatedEngine;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['boat-components', boatId] });
      queryClient.invalidateQueries({ queryKey: ['boat-dashboard', boatId] });
      queryClient.invalidateQueries({ queryKey: ['boats'] });
      
      toast.success('Heures moteur mises à jour', {
        description: 'Les heures moteur ont été modifiées avec succès.',
      });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      
      // Handle specific error messages
      if (error.message?.includes('ne peuvent pas être négatives')) {
        toast.error('Erreur de validation', {
          description: 'Les heures moteur ne peuvent pas être négatives.',
        });
      } else if (error.message?.includes('ne peuvent pas être supérieures')) {
        toast.error('Erreur de validation', {
          description: 'Les heures de vidange ne peuvent pas être supérieures aux heures actuelles.',
        });
      } else {
        toast.error('Erreur', {
          description: 'Impossible de mettre à jour les heures moteur. Veuillez réessayer.',
        });
      }
    },
  });
};
