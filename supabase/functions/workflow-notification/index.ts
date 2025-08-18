import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowNotificationRequest {
  orderId: string;
  recipientUserId: string;
  notificationType: string;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, recipientUserId, notificationType, title, message, priority = 'normal' }: WorkflowNotificationRequest = await req.json();

    console.log('Processing workflow notification:', { orderId, recipientUserId, notificationType, title, priority });

    // Get recipient profile information
    const { data: recipientProfile, error: profileError } = await supabase
      .from('profiles')
      .select('name, email, role, base_id')
      .eq('id', recipientUserId)
      .single();

    if (profileError) {
      throw new Error(`Failed to get recipient profile: ${profileError.message}`);
    }

    // Create notification in database
    const { error: notificationError } = await supabase
      .from('workflow_notifications')
      .insert({
        order_id: orderId,
        recipient_user_id: recipientUserId,
        notification_type: notificationType,
        title,
        message,
        is_sent: false
      });

    if (notificationError) {
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }

    // Send push notification based on priority and type
    let shouldSendPush = false;
    let pushTitle = title;
    let pushMessage = message;

    switch (notificationType) {
      case 'urgent_approval':
      case 'stuck_alert':
        shouldSendPush = true;
        pushTitle = `🚨 ${title}`;
        break;
      case 'approval_required':
        if (recipientProfile.role === 'direction') {
          shouldSendPush = true;
          pushTitle = `⏳ ${title}`;
        }
        break;
      case 'auto_reception':
        shouldSendPush = true;
        pushTitle = `📦 ${title}`;
        break;
      case 'automation_update':
        shouldSendPush = priority === 'high' || priority === 'urgent';
        pushTitle = `⚡ ${title}`;
        break;
      default:
        shouldSendPush = priority === 'urgent';
    }

    // Send email notification for critical alerts
    if (shouldSendPush && (priority === 'urgent' || notificationType === 'urgent_approval')) {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: recipientProfile.email,
            recipientName: recipientProfile.name,
            title: pushTitle,
            message: pushMessage,
            orderId,
            priority
          }
        });

        if (emailError) {
          console.warn('Failed to send email notification:', emailError);
        } else {
          console.log('Email notification sent successfully');
        }
      } catch (emailSendError) {
        console.warn('Email notification service error:', emailSendError);
      }
    }

    // Mark notification as sent
    const { error: updateError } = await supabase
      .from('workflow_notifications')
      .update({ 
        is_sent: true, 
        sent_at: new Date().toISOString() 
      })
      .eq('order_id', orderId)
      .eq('recipient_user_id', recipientUserId)
      .eq('notification_type', notificationType);

    if (updateError) {
      console.warn('Failed to mark notification as sent:', updateError);
    }

    // Send real-time notification via Supabase Realtime
    try {
      const channel = supabase.channel(`notifications_${recipientUserId}`);
      await channel.send({
        type: 'broadcast',
        event: 'workflow_notification',
        payload: {
          orderId,
          notificationType,
          title: pushTitle,
          message: pushMessage,
          priority,
          timestamp: new Date().toISOString()
        }
      });
      console.log('Real-time notification sent');
    } catch (realtimeError) {
      console.warn('Failed to send real-time notification:', realtimeError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        pushSent: shouldSendPush,
        recipient: recipientProfile.name 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in workflow notification function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});