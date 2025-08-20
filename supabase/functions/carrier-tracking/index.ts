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

interface Track123Event {
  time: string;
  utc: string;
  stage: string;
  description: string;
  location: string;
}

interface Track123Data {
  id: string;
  tracking_number: string;
  carrier_code: string;
  carrier_name: string;
  status: string;
  stage: string;
  origin_country: string;
  destination_country: string;
  original_country: string;
  itemTimeLength: number;
  stayTimeLength: number;
  service_code: string;
  package_type: string;
  events: Track123Event[];
  lastUpdateTime: string;
  delivery_status: string;
  delivery_substatus: string;
  delivery_date?: string;
  estimated_delivery_date?: string;
}

interface Track123Response {
  meta: {
    code: number;
    type: string;
    message: string;
  };
  data: Track123Data;
}

async function fetchTrack123Tracking(trackingNumber: string, carrier?: string): Promise<TrackingData> {
  try {
    console.log('Fetching Track123 tracking for:', trackingNumber, 'carrier:', carrier);
    
    const track123ApiKey = Deno.env.get('TRACK123_API_KEY');
    if (!track123ApiKey) {
      throw new Error('Track123 API key not configured');
    }

    // Créer un tracker si un transporteur est spécifié
    if (carrier) {
      try {
        const createResponse = await fetch('https://api.track123.com/v1/trackings', {
          method: 'POST',
          headers: {
            'Track123-Api-Secret': track123ApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tracking_number: trackingNumber,
            carrier_code: carrier.toLowerCase()
          })
        });

        if (!createResponse.ok) {
          console.log('Failed to create tracker, continuing with simple lookup...');
        } else {
          console.log('Tracker created successfully');
        }
      } catch (createError) {
        console.log('Error creating tracker:', createError);
      }
    }

    // Récupérer les informations de suivi
    const trackingResponse = await fetch(`https://api.track123.com/v1/trackings/get?nums=${trackingNumber}`, {
      method: 'GET',
      headers: {
        'Track123-Api-Secret': track123ApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!trackingResponse.ok) {
      throw new Error(`Track123 API error: ${trackingResponse.status} ${trackingResponse.statusText}`);
    }

    const response: Track123Response = await trackingResponse.json();
    console.log('Track123 response:', JSON.stringify(response, null, 2));

    if (response.meta.code !== 200) {
      throw new Error(`Track123 API error: ${response.meta.message}`);
    }

    if (!response.data) {
      throw new Error('No tracking information found');
    }

    const tracking = response.data;
    const events = tracking.events || [];

    // Déterminer le statut basé sur le stage Track123
    let status: TrackingData['status'] = 'pending';
    let location = tracking.origin_country || 'Informations en cours de récupération';
    let lastUpdate = new Date().toLocaleDateString('fr-FR');

    // Mapper les stages Track123 vers nos statuts
    switch (tracking.stage?.toLowerCase()) {
      case 'delivered':
        status = 'delivered';
        location = 'Livré au destinataire';
        break;
      case 'out_for_delivery':
      case 'in_transit':
      case 'transit':
        status = 'in_transit';
        break;
      case 'exception':
      case 'expired':
      case 'undelivered':
        status = 'exception';
        break;
      case 'info_received':
      case 'pickup':
      default:
        status = 'pending';
        break;
    }

    // Utiliser les événements pour obtenir des informations plus précises
    if (events.length > 0) {
      // Trier les événements par date (plus récent en premier)
      const sortedEvents = events.sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      );
      
      const lastEvent = sortedEvents[0];
      
      // Mettre à jour les informations avec le dernier événement
      lastUpdate = new Date(lastEvent.time).toLocaleDateString('fr-FR');
      
      if (lastEvent.location) {
        location = lastEvent.location;
      }

      // Affiner le statut basé sur la description de l'événement
      const description = lastEvent.description?.toLowerCase() || '';
      if (description.includes('delivered') || description.includes('livré')) {
        status = 'delivered';
        location = 'Livré au destinataire';
      } else if (description.includes('out for delivery') || description.includes('en cours de livraison')) {
        status = 'in_transit';
      } else if (description.includes('exception') || description.includes('failed') || description.includes('échec')) {
        status = 'exception';
      }
    }

    // Utiliser la date de livraison réelle si disponible
    if (tracking.delivery_date) {
      lastUpdate = new Date(tracking.delivery_date).toLocaleDateString('fr-FR');
    } else if (tracking.lastUpdateTime) {
      lastUpdate = new Date(tracking.lastUpdateTime).toLocaleDateString('fr-FR');
    }

    // Mapper les événements pour l'affichage
    const mappedEvents = events.map(event => ({
      date: new Date(event.time).toLocaleDateString('fr-FR'),
      status: event.stage === 'delivered' ? 'delivered' : 
              event.stage === 'in_transit' || event.stage === 'out_for_delivery' ? 'in_transit' : 
              event.stage === 'exception' ? 'exception' : 'pending',
      location: event.location || 'Localisation non disponible',
      description: event.description || 'Événement de suivi'
    })).reverse(); // Inverser pour avoir les plus anciens en premier

    const trackingData: TrackingData = {
      status,
      location,
      lastUpdate,
      estimatedDelivery: tracking.estimated_delivery_date ? 
        new Date(tracking.estimated_delivery_date).toLocaleDateString('fr-FR') :
        tracking.delivery_date ?
        new Date(tracking.delivery_date).toLocaleDateString('fr-FR') :
        status === 'delivered' ? lastUpdate : 
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      trackingUrl: `https://www.track123.com/track/en/${trackingNumber}`,
      events: mappedEvents
    };

    console.log('*** FINAL TRACK123 TRACKING DATA ***');
    console.log(JSON.stringify(trackingData, null, 2));
    return trackingData;

  } catch (error) {
    console.error('Track123 API error:', error);
    
    // Fallback - retourner des données de base
    return {
      status: 'pending',
      location: 'Informations non disponibles',
      lastUpdate: new Date().toLocaleDateString('fr-FR'),
      trackingUrl: `https://www.track123.com/track/en/${trackingNumber}`,
      events: [{
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'pending',
        location: 'API Track123',
        description: 'Consultez le suivi complet sur Track123.com'
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
    console.log('Track123 tracking function called');
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

    // Utiliser Track123 pour tous les transporteurs
    const courierCode = carrier ? SUPPORTED_CARRIERS[carrier.toLowerCase()] : undefined;
    const trackingData = await fetchTrack123Tracking(trackingNumber, courierCode);
    
    console.log('Final tracking data:', trackingData);

    return new Response(
      JSON.stringify(trackingData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in track123-tracking:', error)
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