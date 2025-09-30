import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { invalidatePlanningQueries } from '@/lib/queryInvalidation';

export interface PreparationOrder {
  id: string;
  planning_activity_id?: string;
  boat_id: string;
  technician_id?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  anomalies_count: number;
  boat: {
    id: string;
    name: string;
    model: string;
  };
  technician?: {
    id: string;
    name: string;
  };
  planning_activity?: {
    id: string;
    title: string;
    description?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    priority: string;
    status: string;
  };
  template?: {
    id: string;
    name: string;
  };
}

export function usePreparationOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['preparation-orders', user?.baseId],
    queryFn: async (): Promise<PreparationOrder[]> => {
      // First get the preparation checklists
      let baseQuery = supabase
        .from('boat_preparation_checklists')
        .select(`
          id,
          planning_activity_id,
          boat_id,
          technician_id,
          status,
          created_at,
          updated_at,
          anomalies_count,
          boats!inner(id, name, model, base_id),
          planning_activities:planning_activity_id(
            id, title, description, scheduled_start, scheduled_end, priority, status
          ),
          preparation_checklist_templates:template_id(id, name)
        `);

      // Filter by base for non-direction users
      if (user?.role !== 'direction') {
        baseQuery = baseQuery.eq('boats.base_id', user?.baseId);
      }

      const { data: orders, error } = await baseQuery.order('created_at', { ascending: false });
      if (error) throw error;

      // Get technician names separately
      const technicianIds = orders?.map(o => o.technician_id).filter(Boolean) || [];
      let technicians: any[] = [];
      
      if (technicianIds.length > 0) {
        const { data: techData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', technicianIds);
        technicians = techData || [];
      }

      return orders?.map(order => ({
        id: order.id,
        planning_activity_id: order.planning_activity_id,
        boat_id: order.boat_id,
        technician_id: order.technician_id,
        status: order.status as 'planned' | 'in_progress' | 'completed' | 'cancelled',
        created_at: order.created_at,
        updated_at: order.updated_at,
        anomalies_count: order.anomalies_count,
        boat: {
          id: order.boats.id,
          name: order.boats.name,
          model: order.boats.model,
        },
        technician: order.technician_id ? 
          technicians.find(t => t.id === order.technician_id) : undefined,
        planning_activity: order.planning_activities ? {
          id: order.planning_activities.id,
          title: order.planning_activities.title,
          description: order.planning_activities.description,
          scheduled_start: order.planning_activities.scheduled_start,
          scheduled_end: order.planning_activities.scheduled_end,
          priority: order.planning_activities.priority,
          status: order.planning_activities.status,
        } : undefined,
        template: order.preparation_checklist_templates ? {
          id: order.preparation_checklist_templates.id,
          name: order.preparation_checklist_templates.name,
        } : undefined,
      })) || [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 10000, // 10 seconds
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // First get the planning activity ID
      const { data: order } = await supabase
        .from('boat_preparation_checklists')
        .select('planning_activity_id')
        .eq('id', orderId)
        .single();

      // Delete the checklist first
      const { error: checklistError } = await supabase
        .from('boat_preparation_checklists')
        .delete()
        .eq('id', orderId);

      if (checklistError) throw checklistError;

      // Delete the planning activity if it exists
      if (order?.planning_activity_id) {
        const { error: activityError } = await supabase
          .from('planning_activities')
          .delete()
          .eq('id', order.planning_activity_id);

        if (activityError) throw activityError;
      }
    },
    onSuccess: () => {
      invalidatePlanningQueries(queryClient);
      toast.success('Ordre de préparation supprimé');
    },
    onError: (error) => {
      console.error('Error deleting preparation order:', error);
      toast.error('Erreur lors de la suppression de l\'ordre');
    }
  });

  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ orderId, technicianId }: { orderId: string; technicianId: string }) => {
      // Update the preparation checklist
      const { error: checklistError } = await supabase
        .from('boat_preparation_checklists')
        .update({ technician_id: technicianId })
        .eq('id', orderId);

      if (checklistError) throw checklistError;

      // Update the planning activity if it exists
      const { data: order } = await supabase
        .from('boat_preparation_checklists')
        .select('planning_activity_id')
        .eq('id', orderId)
        .single();

      if (order?.planning_activity_id) {
        const { error: activityError } = await supabase
          .from('planning_activities')
          .update({ technician_id: technicianId })
          .eq('id', order.planning_activity_id);

        if (activityError) throw activityError;
      }
    },
    onSuccess: () => {
      invalidatePlanningQueries(queryClient);
      toast.success('Technicien assigné');
    },
    onError: (error) => {
      console.error('Error assigning technician:', error);
      toast.error('Erreur lors de l\'assignation du technicien');
    }
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    deleteOrder: (orderId: string) => deleteOrderMutation.mutate(orderId),
    assignTechnician: (orderId: string, technicianId: string) => 
      assignTechnicianMutation.mutate({ orderId, technicianId }),
    isDeleting: deleteOrderMutation.isPending,
    isAssigning: assignTechnicianMutation.isPending,
  };
}