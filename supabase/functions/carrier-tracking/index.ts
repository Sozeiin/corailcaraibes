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
  location: string;
  detail: string;
  stage: string;
}

interface Track123Data {
  tracking_number: string;
  carrier_code: string;
  carrier_name: string;
  status: string;
  destination_country: string;
  origin_country: string;
  events: Track123Event[];
  delivery_date?: string;
  estimated_delivery_date?: string;
}

interface Track123Response {
  code: number;
  message: string;
  data: Track123Data;
}

async function fetchTrack123Tracking(trackingNumber: string, carrier?: string): Promise<TrackingData> {
  try {
    console.log('Fetching Track123 tracking for:', trackingNumber, 'carrier:', carrier);
    
    const track123ApiKey = Deno.env.get('TRACK123_API_KEY');
    if (!track123ApiKey) {
      throw new Error('Track123 API key not configured');
    }

    // Essayer d'abord de créer un tracker
    if (carrier) {
      try {
        const createResponse = await fetch('https://api.track123.com/v2/trackings', {
          method: 'POST',
          headers: {
            'Track123-Api-Secret': track123ApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            tracking_number: trackingNumber,
            carrier_code: carrier.toLowerCase()
          })
        });

        console.log('Create tracker response status:', createResponse.status);
        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('Tracker created:', createData);
        }
      } catch (createError) {
        console.log('Error creating tracker:', createError);
      }
    }

    // Récupérer les informations de suivi avec l'API v2
    const trackingResponse = await fetch(`https://api.track123.com/v2/trackings/get?nums=${trackingNumber}`, {
      method: 'GET',
      headers: {
        'Track123-Api-Secret': track123ApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Track123 API response status:', trackingResponse.status);
    
    if (!trackingResponse.ok) {
      const errorText = await trackingResponse.text();
      console.error('Track123 API error response:', errorText);
      throw new Error(`Track123 API error: ${trackingResponse.status} - ${errorText}`);
    }

    const response: Track123Response = await trackingResponse.json();
    console.log('Track123 full response:', JSON.stringify(response, null, 2));

    if (response.code !== 200) {
      console.error('Track123 API error code:', response.code, response.message);
      throw new Error(`Track123 API error: ${response.message}`);
    }

    if (!response.data) {
      throw new Error('No tracking data found in response');
    }

    const tracking = response.data;
    const events = tracking.events || [];

    console.log('Track123 tracking data:', tracking);
    console.log('Track123 events:', events);

    // Déterminer le statut basé sur le status Track123
    let status: TrackingData['status'] = 'pending';
    let location = tracking.origin_country || 'En cours de traitement';
    let lastUpdate = new Date().toLocaleDateString('fr-FR');

    // Mapper les statuts Track123
    switch (tracking.status?.toLowerCase()) {
      case 'delivered':
        status = 'delivered';
        location = 'Livré au destinataire';
        break;
      case 'transit':
      case 'out_for_delivery':
      case 'in_transit':
        status = 'in_transit';
        location = 'En transit';
        break;
      case 'exception':
      case 'expired':
      case 'undelivered':
        status = 'exception';
        location = 'Incident de livraison';
        break;
      case 'info_received':
      case 'pickup':
      default:
        status = 'pending';
        location = 'Informations reçues';
        break;
    }

    // Utiliser les événements pour affiner les informations
    if (events.length > 0) {
      // Trier les événements par date (plus récent en premier)
      const sortedEvents = events.sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      );
      
      const lastEvent = sortedEvents[0];
      console.log('Last event:', lastEvent);
      
      // Mettre à jour avec le dernier événement
      if (lastEvent.time) {
        lastUpdate = new Date(lastEvent.time).toLocaleDateString('fr-FR');
      }
      
      if (lastEvent.location) {
        location = lastEvent.location;
      }

      // Affiner le statut basé sur les événements
      if (lastEvent.detail) {
        const detail = lastEvent.detail.toLowerCase();
        if (detail.includes('delivered') || detail.includes('livré') || detail.includes('remis')) {
          status = 'delivered';
          location = 'Livré au destinataire';
        } else if (detail.includes('out for delivery') || detail.includes('en cours de livraison') || detail.includes('tournée')) {
          status = 'in_transit';
        } else if (detail.includes('exception') || detail.includes('échec') || detail.includes('failed')) {
          status = 'exception';
        }
      }
    }

    // Utiliser la date de livraison si disponible
    if (tracking.delivery_date) {
      status = 'delivered';
      location = 'Livré au destinataire';
      lastUpdate = new Date(tracking.delivery_date).toLocaleDateString('fr-FR');
    }

    // Mapper les événements pour l'affichage
    const mappedEvents = events.map(event => ({
      date: new Date(event.time).toLocaleDateString('fr-FR'),
      status: event.stage === 'delivered' || event.detail?.toLowerCase().includes('delivered') ? 'delivered' : 
              event.stage === 'transit' || event.stage === 'out_for_delivery' ? 'in_transit' : 
              event.stage === 'exception' ? 'exception' : 'pending',
      location: event.location || 'Localisation non disponible',
      description: event.detail || event.stage || 'Événement de suivi'
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
      trackingUrl: `https://www.track123.com/track/${trackingNumber}`,
      events: mappedEvents.length > 0 ? mappedEvents : [{
        date: lastUpdate,
        status: status,
        location: location,
        description: `Suivi Track123 - ${trackingNumber}`
      }]
    };

    console.log('*** FINAL TRACK123 TRACKING DATA ***');
    console.log(JSON.stringify(trackingData, null, 2));
    return trackingData;

  } catch (error) {
    console.error('Track123 API error:', error);
    console.error('Error stack:', error.stack);
    
    // Fallback - retourner des données de base avec plus d'informations d'erreur
    return {
      status: 'pending',
      location: 'Service de suivi temporairement indisponible',
      lastUpdate: new Date().toLocaleDateString('fr-FR'),
      trackingUrl: `https://www.track123.com/track/${trackingNumber}`,
      events: [{
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'pending',
        location: 'API Track123',
        description: `Erreur: ${error.message}. Consultez le suivi sur Track123.com`
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