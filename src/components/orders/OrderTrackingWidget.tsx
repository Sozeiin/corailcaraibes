import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { useToast } from '@/hooks/use-toast';

interface OrderTrackingWidgetProps {
  orderId: string;
  trackingNumber?: string;
  carrier?: string;
  onUpdateTracking?: (trackingNumber: string, carrier: string) => void;
}

export function OrderTrackingWidget({ 
  orderId, 
  trackingNumber, 
  carrier, 
  onUpdateTracking 
}: OrderTrackingWidgetProps) {
  const [editingTracking, setEditingTracking] = useState(false);
  const [newTrackingNumber, setNewTrackingNumber] = useState(trackingNumber || '');
  const [newCarrier, setNewCarrier] = useState(carrier || 'chronopost');
  const { toast } = useToast();
  
  const { trackingData, isLoading, error, refetch } = useOrderTracking({
    trackingNumber,
    carrier
  });

  console.log('OrderTrackingWidget state:', { 
    trackingNumber, 
    carrier, 
    trackingData, 
    isLoading, 
    error 
  });

  const carriers = [
    { value: 'chronopost', label: 'Chronopost', color: 'bg-blue-500' },
    { value: 'dhl', label: 'DHL', color: 'bg-yellow-500' },
    { value: 'fedex', label: 'FedEx', color: 'bg-purple-500' },
    { value: 'ups', label: 'UPS', color: 'bg-amber-600' },
    { value: 'colissimo', label: 'Colissimo', color: 'bg-blue-600' },
    { value: 'dpd', label: 'DPD', color: 'bg-red-500' }
  ];

  const handleSaveTracking = () => {
    if (newTrackingNumber.trim() && onUpdateTracking) {
      onUpdateTracking(newTrackingNumber.trim(), newCarrier);
      setEditingTracking(false);
      toast({
        title: "Informations de suivi mises à jour",
        description: "Le numéro de suivi a été enregistré avec succès."
      });
    }
  };

  const handleRefresh = () => {
    console.log('Refresh button clicked');
    if (trackingNumber && carrier) {
      console.log('Calling refetch with:', { trackingNumber, carrier });
      refetch();
      toast({
        title: "Actualisation en cours",
        description: "Récupération des dernières informations de suivi..."
      });
    } else {
      console.log('No tracking info to refresh');
      toast({
        title: "Impossible d'actualiser",
        description: "Aucun numéro de suivi configuré",
        variant: "destructive"
      });
    }
  };

  const handleOpenTracking = () => {
    console.log('Open tracking clicked');
    if (trackingData?.trackingUrl) {
      console.log('Opening URL:', trackingData.trackingUrl);
      try {
        window.open(trackingData.trackingUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('Error opening tracking URL:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'ouvrir le lien de suivi",
          variant: "destructive"
        });
      }
    } else {
      console.log('No tracking URL available');
      toast({
        title: "Lien indisponible",
        description: "Le lien de suivi n'est pas disponible",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_transit':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'exception':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Livré';
      case 'in_transit':
        return 'En transit';
      case 'pending':
        return 'En attente';
      case 'exception':
        return 'Problème';
      default:
        return 'Inconnu';
    }
  };

  const selectedCarrier = carriers.find(c => c.value === (carrier || newCarrier));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Suivi de la commande
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!trackingNumber || editingTracking ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Transporteur</label>
              <select
                value={newCarrier}
                onChange={(e) => setNewCarrier(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {carriers.map(carrier => (
                  <option key={carrier.value} value={carrier.value}>
                    {carrier.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Numéro de suivi</label>
              <Input
                value={newTrackingNumber}
                onChange={(e) => setNewTrackingNumber(e.target.value)}
                placeholder="Entrez le numéro de suivi"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveTracking} size="sm">
                Enregistrer
              </Button>
              {trackingNumber && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingTracking(false)}
                >
                  Annuler
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${selectedCarrier?.color}`} />
                <span className="font-medium">{selectedCarrier?.label}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingTracking(true)}
              >
                Modifier
              </Button>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Numéro de suivi:</span>
                <span className="font-mono font-medium">{trackingNumber}</span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                Chargement des informations de suivi...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="w-4 h-4" />
                Erreur lors du chargement du suivi
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="ml-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Actualisation...' : 'Réessayer'}
                </Button>
              </div>
            ) : trackingData ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(trackingData.status)}
                  <Badge variant="outline">
                    {getStatusLabel(trackingData.status)}
                  </Badge>
                </div>
                
                {trackingData.estimatedDelivery && (
                  <div className="text-sm text-gray-600">
                    <strong>Livraison estimée:</strong> {trackingData.estimatedDelivery}
                  </div>
                )}
                
                {trackingData.lastUpdate && (
                  <div className="text-sm text-gray-600">
                    <strong>Dernière mise à jour:</strong> {trackingData.lastUpdate}
                  </div>
                )}
                
                {trackingData.location && (
                  <div className="text-sm text-gray-600">
                    <strong>Localisation:</strong> {trackingData.location}
                  </div>
                )}
                
                {trackingData.trackingUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleOpenTracking}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir le suivi détaillé
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Cliquez sur "Actualiser" pour obtenir les informations de suivi
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  Actualisation...
                </>
              ) : (
                'Actualiser le suivi'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}