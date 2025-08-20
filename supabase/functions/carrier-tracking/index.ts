import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

interface Ship24Event {
  eventId: string;
  trackingNumber: string;
  eventTrackingNumber: string;
  status: string;
  occurredAt: string;
  order: number;
  datetime: string;
  hasNoTime: boolean;
  utcOffset: string;
  location: string;
  sourceFile: string;
  courier: {
    courierId: number;
    courierName: string;
    courierCode: string;
  };
  statusCategory: string;
  statusMilestone: string;
}

interface Ship24Response {
  data: {
    trackings: Array<{
      tracker: {
        trackingNumber: string;
        isSubscribed: boolean;
        updatedAt: string;
        courierCode: string;
        originCountryCode: string;
        destinationCountryCode: string;
      };
      events: Ship24Event[];
      statistics: {
        timestamps: {
          infoReceivedAt: string;
          inTransitAt: string;
          outForDeliveryAt?: string;
          deliveredAt?: string;
          failedAttemptAt?: string;
          availableForPickupAt?: string;
          exceptionAt?: string;
        };
        progressPercentage: number;
      };
      delivery: {
        estimatedDeliveryDate?: string;
        service?: string;
        signedBy?: string;
      };
    }>;
  };
}

async function fetchShip24Tracking(trackingNumber: string, courier?: string): Promise<TrackingData> {
  try {
    console.log('Fetching Ship24 tracking for:', trackingNumber, 'courier:', courier);
    
    const ship24ApiKey = Deno.env.get('SHIP24_API_KEY');
    if (!ship24ApiKey) {
      throw new Error('Ship24 API key not configured');
    }

    // Créer un tracker pour ce numéro de suivi
    const createTrackerResponse = await fetch('https://api.ship24.com/public/v1/trackers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ship24ApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trackingNumber: trackingNumber,
        courierCode: courier ? [courier.toLowerCase()] : undefined
      })
    });

    if (!createTrackerResponse.ok) {
      console.log('Failed to create tracker, trying to get existing tracking...');
    }

    // Récupérer les informations de suivi
    const trackingResponse = await fetch(`https://api.ship24.com/public/v1/trackers/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ship24ApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trackingNumbers: [trackingNumber]
      })
    });

    if (!trackingResponse.ok) {
      throw new Error(`Ship24 API error: ${trackingResponse.status} ${trackingResponse.statusText}`);
    }

    const data: Ship24Response = await trackingResponse.json();
    console.log('Ship24 response:', JSON.stringify(data, null, 2));

    if (!data.data?.trackings?.length) {
      throw new Error('No tracking information found');
    }

    const tracking = data.data.trackings[0];
    const events = tracking.events || [];
    const statistics = tracking.statistics;
    const delivery = tracking.delivery;

    // Déterminer le statut basé sur les timestamps
    let status: TrackingData['status'] = 'pending';
    let location = 'Informations en cours de récupération';
    let lastUpdate = new Date().toLocaleDateString('fr-FR');

    if (statistics.timestamps.deliveredAt) {
      status = 'delivered';
      location = 'Livré au destinataire';
      lastUpdate = new Date(statistics.timestamps.deliveredAt).toLocaleDateString('fr-FR');
    } else if (statistics.timestamps.outForDeliveryAt) {
      status = 'in_transit';
      location = 'En cours de livraison';
      lastUpdate = new Date(statistics.timestamps.outForDeliveryAt).toLocaleDateString('fr-FR');
    } else if (statistics.timestamps.inTransitAt) {
      status = 'in_transit';
      location = 'En transit';
      lastUpdate = new Date(statistics.timestamps.inTransitAt).toLocaleDateString('fr-FR');
    } else if (statistics.timestamps.exceptionAt) {
      status = 'exception';
      location = 'Incident de livraison';
      lastUpdate = new Date(statistics.timestamps.exceptionAt).toLocaleDateString('fr-FR');
    } else if (statistics.timestamps.infoReceivedAt) {
      status = 'pending';
      location = 'Informations reçues';
      lastUpdate = new Date(statistics.timestamps.infoReceivedAt).toLocaleDateString('fr-FR');
    }

    // Utiliser les événements pour obtenir des informations plus précises
    if (events.length > 0) {
      // Trier les événements par date (plus récent en premier)
      const sortedEvents = events.sort((a, b) => 
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );
      
      const lastEvent = sortedEvents[0];
      
      // Mettre à jour les informations avec le dernier événement
      lastUpdate = new Date(lastEvent.occurredAt).toLocaleDateString('fr-FR');
      
      if (lastEvent.location) {
        location = lastEvent.location;
      }

      // Déterminer le statut basé sur le statusMilestone
      switch (lastEvent.statusMilestone?.toLowerCase()) {
        case 'delivered':
          status = 'delivered';
          location = lastEvent.signedBy ? `Livré - Signé par ${lastEvent.signedBy}` : 'Livré au destinataire';
          break;
        case 'out_for_delivery':
        case 'in_transit':
          status = 'in_transit';
          break;
        case 'exception':
        case 'failed_attempt':
          status = 'exception';
          break;
        default:
          if (lastEvent.status?.toLowerCase().includes('livré') || 
              lastEvent.status?.toLowerCase().includes('delivered')) {
            status = 'delivered';
            location = 'Livré au destinataire';
          } else if (lastEvent.status?.toLowerCase().includes('transit') ||
                     lastEvent.status?.toLowerCase().includes('en cours')) {
            status = 'in_transit';
          }
          break;
      }
    }

    // Mapper les événements pour l'affichage
    const mappedEvents = events.map(event => ({
      date: new Date(event.occurredAt).toLocaleDateString('fr-FR'),
      status: event.statusMilestone === 'delivered' ? 'delivered' : 
              event.statusMilestone === 'in_transit' || event.statusMilestone === 'out_for_delivery' ? 'in_transit' : 
              event.statusMilestone === 'exception' ? 'exception' : 'pending',
      location: event.location || 'Localisation non disponible',
      description: event.status || 'Événement de suivi'
    })).reverse(); // Inverser pour avoir les plus anciens en premier

    const trackingData: TrackingData = {
      status,
      location,
      lastUpdate,
      estimatedDelivery: delivery.estimatedDeliveryDate ? 
        new Date(delivery.estimatedDeliveryDate).toLocaleDateString('fr-FR') :
        status === 'delivered' ? lastUpdate : 
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      trackingUrl: `https://ship24.com/tracking/${trackingNumber}`,
      events: mappedEvents
    };

    console.log('*** FINAL SHIP24 TRACKING DATA ***');
    console.log(JSON.stringify(trackingData, null, 2));
    return trackingData;

  } catch (error) {
    console.error('Ship24 API error:', error);
    
    // Fallback - retourner des données de base
    return {
      status: 'pending',
      location: 'Informations non disponibles',
      lastUpdate: new Date().toLocaleDateString('fr-FR'),
      trackingUrl: `https://ship24.com/tracking/${trackingNumber}`,
      events: [{
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'pending',
        location: 'API Ship24',
        description: 'Consultez le suivi complet sur Ship24.com'
      }]
    };
  }
}

// Configuration des transporteurs supportés
const SUPPORTED_CARRIERS = {
  chronopost: 'chronopost',
  colissimo: 'colissimo',
  dhl: 'dhl',
  fedex: 'fedex',
  ups: 'ups',
  dpd: 'dpd',
  tnt: 'tnt',
  gls: 'gls'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Ship24 tracking function called');
    const { trackingNumber, carrier } = await req.json();
    console.log('Request:', { trackingNumber, carrier });

    if (!trackingNumber) {
      return new Response(
        JSON.stringify({ error: 'Numéro de suivi requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Utiliser Ship24 pour tous les transporteurs
    const courierCode = carrier ? SUPPORTED_CARRIERS[carrier.toLowerCase()] : undefined;
    const trackingData = await fetchShip24Tracking(trackingNumber, courierCode);
    
    console.log('Final tracking data:', trackingData);

    return new Response(
      JSON.stringify(trackingData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in ship24-tracking:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la récupération du suivi',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})