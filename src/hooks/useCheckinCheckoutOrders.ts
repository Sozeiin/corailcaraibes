import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CheckinCheckoutOrder {
  id: string;
  boat_id: string;
  technician_id: string | null;
  order_type: 'checkin' | 'checkout';
  scheduled_start: string;
  scheduled_end: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  rental_data: any;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_checklist_id: string | null;
  base_id: string;
  boat?: {
    id: string;
    name: string;
    model: string;
  };
  technician?: {
    id: string;
    name: string;
  };
  created_by_name?: string;
}

export const useCheckinCheckoutOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['checkin-checkout-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkin_checkout_orders')
        .select(`
          *,
          boat:boats!checkin_checkout_orders_boat_id_fkey (
            id,
            name,
            model
          ),
          technician:profiles!checkin_checkout_orders_technician_id_fkey (
            id,
            name
          ),
          created_by_profile:profiles!checkin_checkout_orders_created_by_fkey (
            name
          )
        `)
        .order('scheduled_start', { ascending: true });

      if (error) throw error;

      return data.map(order => ({
        ...order,
        created_by_name: order.created_by_profile?.name
      }));
    },
    refetchInterval: 30000,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (newOrder: Omit<CheckinCheckoutOrder, 'id' | 'created_at' | 'updated_at' | 'status' | 'created_by' | 'boat' | 'technician' | 'created_by_name'>) => {
      const { data, error } = await supabase
        .from('checkin_checkout_orders')
        .insert({
          ...newOrder,
          created_by: user?.id,
          status: 'assigned'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-checkout-orders'] });
      toast.success('Ordre de check-in/out créé avec succès');
    },
    onError: (error) => {
      console.error('Error creating order:', error);
      toast.error('Erreur lors de la création de l\'ordre');
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CheckinCheckoutOrder> }) => {
      const { data, error } = await supabase
        .from('checkin_checkout_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-checkout-orders'] });
      toast.success('Ordre mis à jour avec succès');
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast.error('Erreur lors de la mise à jour de l\'ordre');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('checkin_checkout_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-checkout-orders'] });
      toast.success('Ordre supprimé avec succès');
    },
    onError: (error) => {
      console.error('Error deleting order:', error);
      toast.error('Erreur lors de la suppression de l\'ordre');
    },
  });

  const startOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('checkin_checkout_orders')
        .update({ status: 'in_progress' })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-checkout-orders'] });
    },
  });

  const completeOrderMutation = useMutation({
    mutationFn: async ({ orderId, checklistId }: { orderId: string; checklistId: string }) => {
      const { data, error } = await supabase
        .from('checkin_checkout_orders')
        .update({ 
          status: 'completed',
          completed_checklist_id: checklistId
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-checkout-orders'] });
      toast.success('Ordre terminé avec succès');
    },
  });

  return {
    orders,
    isLoading,
    error,
    createOrder: createOrderMutation.mutate,
    updateOrder: updateOrderMutation.mutate,
    deleteOrder: deleteOrderMutation.mutate,
    startOrder: startOrderMutation.mutate,
    completeOrder: completeOrderMutation.mutate,
    isCreating: createOrderMutation.isPending,
    isUpdating: updateOrderMutation.isPending,
    isDeleting: deleteOrderMutation.isPending,
  };
};