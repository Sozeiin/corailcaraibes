import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import webpush from "npm:web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

interface SendPushRequest {
  userIds?: string[];
  baseId?: string;
  title: string;
  body?: string;
  url?: string;
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

    const { userIds, baseId, title, body, url }: SendPushRequest = await req.json();

    console.log('Sending push notifications:', { userIds, baseId, title });

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      Deno.env.get('VAPID_MAILTO') ?? 'mailto:contact@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    );

    // Build query to get subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('active', true);

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    if (baseId) {
      query = query.eq('base_id', baseId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found');
      return new Response(JSON.stringify({
        success: true,
        sentCount: 0,
        message: 'No active subscriptions found',
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log(`Found ${subscriptions.length} active subscriptions`);

    // Prepare notification payload
    const payload = JSON.stringify({
      title: title,
      body: body || '',
      url: url || '/',
      timestamp: new Date().toISOString(),
    });

    // Send notifications to all subscriptions
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

          console.log(`Notification sent successfully to subscription ${sub.id}`);
          return { success: true, subscriptionId: sub.id };
        } catch (error: any) {
          console.error(`Failed to send to subscription ${sub.id}:`, error);

          // Handle expired/invalid subscriptions (410 Gone)
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Marking subscription ${sub.id} as inactive`);
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
    const failureCount = results.length - successCount;

    console.log(`Push notifications sent: ${successCount} success, ${failureCount} failures`);

    return new Response(JSON.stringify({
      success: true,
      sentCount: successCount,
      failedCount: failureCount,
      totalSubscriptions: subscriptions.length,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-web-push function:", error);
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
