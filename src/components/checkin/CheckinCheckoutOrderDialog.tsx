import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckinCheckoutOrders } from '@/hooks/useCheckinCheckoutOrders';
import { format } from 'date-fns';

interface CheckinCheckoutOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: any;
}

export function CheckinCheckoutOrderDialog({ 
  open, 
  onOpenChange, 
  order 
}: CheckinCheckoutOrderDialogProps) {
  const { user } = useAuth();
  const { createOrder, updateOrder, isCreating, isUpdating } = useCheckinCheckoutOrders();
  
  const [formData, setFormData] = useState({
    boat_id: '',
    technician_id: '',
    order_type: 'checkin' as 'checkin' | 'checkout',
    scheduled_start: '',
    scheduled_end: '',
    notes: '',
    rental_data: {}
  });

  // Fetch boats
  const { data: boats = [] } = useQuery({
    queryKey: ['boats-for-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('id, name, model')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-for-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'technicien')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Initialize form when order changes
  useEffect(() => {
    if (order) {
      setFormData({
        boat_id: order.boat_id || '',
        technician_id: order.technician_id || '',
        order_type: order.order_type || 'checkin',
        scheduled_start: order.scheduled_start ? format(new Date(order.scheduled_start), "yyyy-MM-dd'T'HH:mm") : '',
        scheduled_end: order.scheduled_end ? format(new Date(order.scheduled_end), "yyyy-MM-dd'T'HH:mm") : '',
        notes: order.notes || '',
        rental_data: order.rental_data || {}
      });
    } else {
      setFormData({
        boat_id: '',
        technician_id: '',
        order_type: 'checkin',
        scheduled_start: '',
        scheduled_end: '',
        notes: '',
        rental_data: {}
      });
    }
  }, [order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const orderData = {
      ...formData,
      base_id: (user as any)?.user_metadata?.base_id || (user as any)?.user_metadata?.baseId || '',
      scheduled_start: new Date(formData.scheduled_start).toISOString(),
      scheduled_end: new Date(formData.scheduled_end).toISOString(),
      completed_checklist_id: null,
    };

    if (order) {
      updateOrder({ id: order.id, updates: orderData });
    } else {
      createOrder(orderData);
    }
    
    onOpenChange(false);
  };

  const handleStartTimeChange = (value: string) => {
    setFormData(prev => {
      const start = new Date(value);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours default
      return {
        ...prev,
        scheduled_start: value,
        scheduled_end: format(end, "yyyy-MM-dd'T'HH:mm")
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {order ? 'Modifier l\'ordre' : 'Créer un nouvel ordre'} de check-in/out
          </DialogTitle>
          <DialogDescription>
            Définissez les détails de l'ordre et assignez-le à un technicien.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="boat_id">Bateau</Label>
              <Select
                value={formData.boat_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, boat_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bateau" />
                </SelectTrigger>
                <SelectContent>
                  {boats.map((boat) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.name} - {boat.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_type">Type d'ordre</Label>
              <Select
                value={formData.order_type}
                onValueChange={(value: 'checkin' | 'checkout') => 
                  setFormData(prev => ({ ...prev, order_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkin">Check-in</SelectItem>
                  <SelectItem value="checkout">Check-out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technician_id">Technicien assigné</Label>
            <Select
              value={formData.technician_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, technician_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un technicien" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Début planifié</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_end">Fin planifiée</Label>
              <Input
                id="scheduled_end"
                type="datetime-local"
                value={formData.scheduled_end}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_end: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Instructions spéciales, informations importantes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating || !formData.boat_id || !formData.technician_id}
            >
              {order ? 'Mettre à jour' : 'Créer l\'ordre'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}