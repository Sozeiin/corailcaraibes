import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import webpush from "npm:web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

interface TestPushRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin token
    const adminToken = req.headers.get('x-admin-token');
    const expectedToken = Deno.env.get('PUSH_ADMIN_TOKEN');
    
    if (!adminToken || adminToken !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId }: TestPushRequest = await req.json();

    console.log('Sending test push notification to user:', userId);

    // Configure web-push
    webpush.setVapidDetails(
      Deno.env.get('VAPID_MAILTO') ?? 'mailto:contact@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    );

    // Get user's active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No active subscriptions found for this user',
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Prepare test notification
    const payload = JSON.stringify({
      title: '🔔 Notification de test',
      body: `Ceci est une notification de test envoyée à ${new Date().toLocaleTimeString('fr-FR')}`,
      url: '/',
      timestamp: new Date().toISOString(),
    });

    // Send to all user's subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          
          // Update last_used_at
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id);

          return { success: true, subscriptionId: sub.id };
        } catch (error: any) {
          console.error(`Failed to send to subscription ${sub.id}:`, error);

          // Mark as inactive if expired
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ active: false })
              .eq('id', sub.id);
          }

          return { success: false, subscriptionId: sub.id, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    return new Response(JSON.stringify({
      success: successCount > 0,
      sentCount: successCount,
      totalSubscriptions: subscriptions.length,
      message: successCount > 0 
        ? `Test notification envoyée avec succès (${successCount}/${subscriptions.length})` 
        : 'Échec de l\'envoi de la notification',
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in test-push function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
