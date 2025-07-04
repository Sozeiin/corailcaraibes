import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  message: string;
  data?: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, message, data }: PushNotificationRequest = await req.json();

    console.log('Sending push notification:', { userId, title, message });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile to check if they have push notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    // Here you would integrate with a push notification service like:
    // - Firebase Cloud Messaging (FCM)
    // - Apple Push Notification service (APNs)
    // - OneSignal
    // - Pusher Beams
    // etc.

    // For now, we'll just log the notification and return success
    console.log('Push notification would be sent to:', profile.email);
    console.log('Title:', title);
    console.log('Message:', message);
    console.log('Data:', data);

    // Example integration with a hypothetical push service:
    /*
    const pushServiceApiKey = Deno.env.get("PUSH_SERVICE_API_KEY");
    if (pushServiceApiKey) {
      const response = await fetch('https://api.pushservice.com/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pushServiceApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: userId,
          title,
          body: message,
          data
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send push notification');
      }
    }
    */

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Push notification processed successfully' 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-push-notification function:", error);
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