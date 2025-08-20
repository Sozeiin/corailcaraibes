import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Order } from '@/types';
import { OrderTrackingWidget } from './OrderTrackingWidget';
import { Truck, Package, AlertCircle } from 'lucide-react';

interface ShippingTrackingFormProps {
  order: Order;
  onComplete: () => void;
}

const CARRIER_OPTIONS = [
  { value: 'chronopost', label: 'Chronopost' },
  { value: 'dhl', label: 'DHL' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'colissimo', label: 'Colissimo' },
  { value: 'dpd', label: 'DPD' }
];

export function ShippingTrackingForm({ order, onComplete }: ShippingTrackingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [showTracking, setShowTracking] = useState(false);

  const shipOrderMutation = useMutation({
    mutationFn: async () => {
      if (!trackingNumber.trim() || !carrier) {
        throw new Error('Le numéro de suivi et le transporteur sont obligatoires');
      }

      // 1. Update order with tracking info
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber.trim(),
          carrier: carrier
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // 2. Advance workflow to shipping_antilles
      const { error: workflowError } = await supabase.rpc('advance_workflow_step', {
        order_id_param: order.id,
        new_status: 'shipping_antilles',
        user_id_param: user?.id,
        notes_param: shippingNotes.trim() || `Expédition via ${carrier} - N° de suivi: ${trackingNumber}`
      });

      if (workflowError) throw workflowError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', order.id] });
      toast({
        title: "Expédition confirmée",
        description: `Commande expédiée avec le numéro de suivi ${trackingNumber}`,
      });
      setShowTracking(true);
    },
    onError: (error) => {
      console.error('Error shipping order:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de confirmer l'expédition",
        variant: "destructive",
      });
    }
  });

  const handleShip = () => {
    shipOrderMutation.mutate();
  };

  if (showTracking) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Package className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-600">Expédition confirmée !</h3>
          <p className="text-gray-600">
            La commande {order.orderNumber} a été expédiée avec succès.
          </p>
        </div>

        <OrderTrackingWidget
          orderId={order.id}
          trackingNumber={trackingNumber}
          carrier={carrier}
          onUpdateTracking={(newTrackingNumber, newCarrier) => {
            setTrackingNumber(newTrackingNumber);
            setCarrier(newCarrier);
          }}
        />

        <div className="flex justify-end">
          <Button onClick={onComplete}>
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Expédition vers les Antilles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Informations de suivi requises
              </p>
              <p className="text-sm text-blue-700">
                Veuillez saisir le transporteur et le numéro de suivi pour permettre le suivi en temps réel de la livraison.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Transporteur *</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un transporteur" />
                </SelectTrigger>
                <SelectContent>
                  {CARRIER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking">Numéro de suivi *</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ex: 1234567890"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes d'expédition (optionnel)</Label>
            <Textarea
              id="notes"
              value={shippingNotes}
              onChange={(e) => setShippingNotes(e.target.value)}
              placeholder="Informations complémentaires sur l'expédition..."
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onComplete}>
              Annuler
            </Button>
            <Button 
              onClick={handleShip}
              disabled={!trackingNumber.trim() || !carrier || shipOrderMutation.isPending}
            >
              {shipOrderMutation.isPending ? 'Confirmation...' : 'Confirmer expédition'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}