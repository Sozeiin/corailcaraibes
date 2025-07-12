import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Fonction pour récupérer les vraies données de suivi via l'API Supabase
const fetchTrackingData = async (trackingNumber: string, carrier: string): Promise<TrackingData> => {
  console.log('fetchTrackingData started with:', { trackingNumber, carrier });
  
  try {
    console.log('Calling Supabase function carrier-tracking...');
    const { data: trackingData, error } = await supabase.functions.invoke('carrier-tracking', {
      body: {
        trackingNumber,
        carrier
      }
    });

    console.log('Supabase function response:', { data: trackingData, error });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Erreur API: ${error.message}`);
    }
    
    // Assurer que l'URL de suivi est disponible
    const config = CARRIER_CONFIGS[carrier as keyof typeof CARRIER_CONFIGS];
    if (config && !trackingData.trackingUrl) {
      trackingData.trackingUrl = config.trackingUrl(trackingNumber);
    }

    console.log('Final tracking data:', trackingData);
    return trackingData;
  } catch (error) {
    console.error('Erreur lors de la récupération du suivi:', error);
    
    // Fallback avec données minimales en cas d'erreur
    const config = CARRIER_CONFIGS[carrier as keyof typeof CARRIER_CONFIGS];
    if (!config) {
      throw new Error(`Transporteur non supporté: ${carrier}`);
    }

    return {
      status: 'pending',
      location: 'Informations non disponibles',
      lastUpdate: new Date().toLocaleDateString('fr-FR'),
      trackingUrl: config.trackingUrl(trackingNumber),
      events: [{
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'pending',
        location: 'Suivi externe',
        description: 'Consultez le suivi complet chez le transporteur'
      }]
    };
  }
};

export const useOrderTracking = ({ trackingNumber, carrier }: UseOrderTrackingProps) => {
  console.log('useOrderTracking called with:', { trackingNumber, carrier });
  
  const query = useQuery({
    queryKey: ['orderTracking', trackingNumber, carrier],
    queryFn: () => {
      console.log('fetchTrackingData called with:', { trackingNumber, carrier });
      return fetchTrackingData(trackingNumber!, carrier!);
    },
    enabled: !!trackingNumber && !!carrier,
    refetchInterval: 5 * 60 * 1000, // Actualiser toutes les 5 minutes
    staleTime: 2 * 60 * 1000, // Considérer les données comme obsolètes après 2 minutes
  });

  console.log('Query status:', { 
    isLoading: query.isLoading, 
    error: query.error, 
    data: query.data,
    enabled: !!trackingNumber && !!carrier 
  });

  const refetch = () => {
    console.log('Manual refetch triggered');
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