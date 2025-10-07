import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscribeRequest {
  subscription: PushSubscription;
  platform?: string;
  userAgent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { subscription, platform, userAgent }: SubscribeRequest = await req.json();

    console.log('Subscribing user to push notifications:', user.id);

    // Extract endpoint and keys from subscription
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Get user's base_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('base_id, tenant_id')
      .eq('id', user.id)
      .single();

    // Upsert subscription (update if exists, insert if not)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        base_id: profile?.base_id,
        tenant_id: profile?.tenant_id,
        endpoint: endpoint,
        p256dh: p256dh,
        auth: auth,
        platform: platform || 'web',
        user_agent: userAgent,
        last_used_at: new Date().toISOString(),
        active: true,
      }, {
        onConflict: 'endpoint',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }

    console.log('Subscription saved successfully:', data.id);

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: data.id,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in subscribe-push function:", error);
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
