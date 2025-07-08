import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  type: 'shipment_created' | 'shipment_shipped' | 'shipment_received'
  shipmentId: string
  data: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, shipmentId, data }: NotificationPayload = await req.json()

    console.log('Processing logistics notification:', { type, shipmentId })

    // Récupérer les détails de l'expédition
    const { data: shipment, error: shipmentError } = await supabase
      .from('logistics_shipments')
      .select(`
        *,
        base_origin:bases!logistics_shipments_base_origin_id_fkey(name),
        base_destination:bases!logistics_shipments_base_destination_id_fkey(name),
        created_by_profile:profiles!logistics_shipments_created_by_fkey(name, email)
      `)
      .eq('id', shipmentId)
      .single()

    if (shipmentError || !shipment) {
      throw new Error(`Shipment not found: ${shipmentError?.message}`)
    }

    let notificationTitle = ''
    let notificationMessage = ''
    let targetUsers: string[] = []

    switch (type) {
      case 'shipment_created':
        notificationTitle = 'Nouvelle expédition créée'
        notificationMessage = `L'expédition ${shipment.shipment_number} vers ${shipment.base_destination?.name} a été créée`
        
        // Notifier les utilisateurs de la base de destination
        const { data: destUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('base_id', shipment.base_destination_id)
          .in('role', ['direction', 'chef_base'])
        
        targetUsers = destUsers?.map(u => u.id) || []
        break

      case 'shipment_shipped':
        notificationTitle = 'Expédition envoyée'
        notificationMessage = `L'expédition ${shipment.shipment_number} a été expédiée et est en transit vers ${shipment.base_destination?.name}`
        
        // Notifier les utilisateurs de la base de destination
        const { data: destUsers2 } = await supabase
          .from('profiles')
          .select('id')
          .eq('base_id', shipment.base_destination_id)
        
        targetUsers = destUsers2?.map(u => u.id) || []
        break

      case 'shipment_received':
        notificationTitle = 'Expédition reçue'
        notificationMessage = `L'expédition ${shipment.shipment_number} a été reçue et validée à ${shipment.base_destination?.name}`
        
        // Notifier les utilisateurs de la base d'origine (Métropole)
        const { data: originUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('base_id', shipment.base_origin_id)
          .in('role', ['direction', 'chef_base'])
        
        targetUsers = originUsers?.map(u => u.id) || []
        break
    }

    // Créer les notifications
    if (targetUsers.length > 0) {
      const notifications = targetUsers.map(userId => ({
        user_id: userId,
        type: 'logistics',
        title: notificationTitle,
        message: notificationMessage,
        data: {
          shipment_id: shipmentId,
          shipment_number: shipment.shipment_number,
          action_type: type
        }
      }))

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notificationError) {
        throw new Error(`Failed to create notifications: ${notificationError.message}`)
      }

      console.log(`Created ${notifications.length} notifications for ${type}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsCreated: targetUsers.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in logistics notification function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})