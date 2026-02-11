import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDateSafe } from '@/lib/dateUtils';

interface CreateInterventionData {
  title: string;
  description: string;
  boat_id: string;
  technician_id?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  base_id: string;
  intervention_type: string;
}

export function useCreateIntervention() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createNotification } = useNotifications();

  return useMutation({
    mutationFn: async (data: CreateInterventionData) => {
      const { data: intervention, error } = await supabase
        .from('interventions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Send notification to technician if assigned
      if (data.technician_id) {
        try {
          const { data: boatData } = await supabase
            .from('boats')
            .select('name, model')
            .eq('id', data.boat_id)
            .single();

          const boatName = boatData ? `${boatData.name} - ${boatData.model}` : 'Bateau non spécifié';
          
          await createNotification({
            user_id: data.technician_id,
            type: 'intervention_assigned',
            title: 'Nouvelle intervention assignée',
            message: `Une intervention "${data.title}" vous a été assignée pour le ${boatName}. Date prévue: ${formatDateSafe(data.scheduled_date)}`,
            data: {
              intervention_id: intervention.id,
              boat_id: data.boat_id,
              scheduled_date: data.scheduled_date,
              title: data.title
            }
          });
        } catch (notificationError) {
          console.error('Erreur lors de l\'envoi de la notification:', notificationError);
          // Don't fail the intervention creation for notification errors
        }
      }

      return intervention;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
    onError: (error) => {
      console.error('Error creating intervention:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'intervention automatique.",
        variant: "destructive"
      });
    }
  });
}