import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface TrackingData {
  status: 'pending' | 'in_transit' | 'delivered' | 'exception';
  estimatedDelivery?: string;
  lastUpdate?: string;
  location?: string;
  trackingUrl?: string;
  events?: Array<{
    date: string;
    status: string;
    location?: string;
    description: string;
  }>;
}

interface UseOrderTrackingProps {
  trackingNumber?: string;
  carrier?: string;
}

// Configuration des APIs de transporteurs
const CARRIER_CONFIGS = {
  chronopost: {
    name: 'Chronopost',
    baseUrl: 'https://ws.chronopost.fr/tracking-cxf/TrackingServiceWS/track',
    trackingUrl: (trackingNumber: string) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${trackingNumber}`
  },
  dhl: {
    name: 'DHL',
    baseUrl: 'https://api-eu.dhl.com/track/shipments',
    trackingUrl: (trackingNumber: string) => `https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`
  },
  fedex: {
    name: 'FedEx',
    baseUrl: 'https://api.fedex.com/track/v1/trackingnumbers',
    trackingUrl: (trackingNumber: string) => `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  },
  ups: {
    name: 'UPS',
    baseUrl: 'https://onlinetools.ups.com/track/v1/details',
    trackingUrl: (trackingNumber: string) => `https://www.ups.com/track?tracknum=${trackingNumber}`
  },
  colissimo: {
    name: 'Colissimo',
    baseUrl: 'https://api.laposte.fr/suivi/v2/idships',
    trackingUrl: (trackingNumber: string) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`
  },
  dpd: {
    name: 'DPD',
    baseUrl: 'https://tracking.dpd.de/rest/plc/fr_FR',
    trackingUrl: (trackingNumber: string) => `https://tracking.dpd.de/status/fr_FR/parcel/${trackingNumber}`
  }
};

// Fonction pour simuler l'API de suivi (à remplacer par de vraies APIs)
const fetchTrackingData = async (trackingNumber: string, carrier: string): Promise<TrackingData> => {
  // Simuler un délai d'API
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const config = CARRIER_CONFIGS[carrier as keyof typeof CARRIER_CONFIGS];
  
  if (!config) {
    throw new Error(`Transporteur non supporté: ${carrier}`);
  }

  // Simulation de données de suivi
  // Dans un vrai projet, ici on ferait un appel à l'API du transporteur
  const mockData: TrackingData = {
    status: 'in_transit',
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
    lastUpdate: new Date().toLocaleString('fr-FR'),
    location: 'Centre de tri - Paris',
    trackingUrl: config.trackingUrl(trackingNumber),
    events: [
      {
        date: new Date().toLocaleString('fr-FR'),
        status: 'in_transit',
        location: 'Centre de tri - Paris',
        description: 'Colis en cours de traitement'
      },
      {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleString('fr-FR'),
        status: 'pending',
        location: 'Dépôt - Lyon',
        description: 'Colis pris en charge par le transporteur'
      }
    ]
  };

  return mockData;
};

export const useOrderTracking = ({ trackingNumber, carrier }: UseOrderTrackingProps) => {
  const [enabled, setEnabled] = useState(false);

  const query = useQuery({
    queryKey: ['orderTracking', trackingNumber, carrier],
    queryFn: () => fetchTrackingData(trackingNumber!, carrier!),
    enabled: enabled && !!trackingNumber && !!carrier,
    refetchInterval: 5 * 60 * 1000, // Actualiser toutes les 5 minutes
    staleTime: 2 * 60 * 1000, // Considérer les données comme obsolètes après 2 minutes
  });

  const refetch = () => {
    setEnabled(true);
    query.refetch();
  };

  return {
    trackingData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch
  };
};

// Hook pour intégrer de vraies APIs de transporteurs
export const useRealCarrierAPI = () => {
  // Fonction pour Chronopost
  const trackChronopost = async (trackingNumber: string): Promise<TrackingData> => {
    // Exemple d'implémentation avec l'API Chronopost
    // Note: Ceci nécessite une clé API et doit être implémenté côté serveur pour éviter les problèmes CORS
    /*
    const response = await fetch('/api/tracking/chronopost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber })
    });
    
    const data = await response.json();
    return {
      status: data.status,
      estimatedDelivery: data.estimatedDelivery,
      lastUpdate: data.lastUpdate,
      location: data.location,
      trackingUrl: `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${trackingNumber}`
    };
    */
    
    throw new Error('API Chronopost non implémentée');
  };

  // Fonction pour DHL
  const trackDHL = async (trackingNumber: string): Promise<TrackingData> => {
    // Exemple d'implémentation avec l'API DHL
    /*
    const response = await fetch('/api/tracking/dhl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber })
    });
    
    const data = await response.json();
    return {
      status: data.status,
      estimatedDelivery: data.estimatedDelivery,
      lastUpdate: data.lastUpdate,
      location: data.location,
      trackingUrl: `https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`
    };
    */
    
    throw new Error('API DHL non implémentée');
  };

  return {
    trackChronopost,
    trackDHL
  };
};