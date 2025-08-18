import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('🔄 Starting workflow automation process...');

    // Execute the main automation function
    const { error: automationError } = await supabase.rpc('process_workflow_automation');

    if (automationError) {
      throw new Error(`Automation process failed: ${automationError.message}`);
    }

    console.log('✅ Workflow automation completed successfully');

    // Get automation statistics
    const { data: recentAlerts, error: alertsError } = await supabase
      .from('workflow_alerts')
      .select('alert_type, severity')
      .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .eq('is_resolved', false);

    if (alertsError) {
      console.warn('Failed to get recent alerts:', alertsError);
    }

    const { data: recentNotifications, error: notificationsError } = await supabase
      .from('workflow_notifications')
      .select('notification_type')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .eq('is_sent', true);

    if (notificationsError) {
      console.warn('Failed to get recent notifications:', notificationsError);
    }

    // Prepare summary statistics
    const stats = {
      alertsGenerated: recentAlerts?.length || 0,
      criticalAlerts: recentAlerts?.filter(a => a.severity === 'critical').length || 0,
      errorAlerts: recentAlerts?.filter(a => a.severity === 'error').length || 0,
      warningAlerts: recentAlerts?.filter(a => a.severity === 'warning').length || 0,
      notificationsSent: recentNotifications?.length || 0,
      processingTime: Date.now(),
      alertTypes: recentAlerts?.reduce((acc: any, alert) => {
        acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    console.log('📊 Automation statistics:', stats);

    // Send summary to direction if there are critical alerts
    if (stats.criticalAlerts > 0 || stats.errorAlerts > 0) {
      const { data: directionUsers, error: directionError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'direction');

      if (!directionError && directionUsers) {
        for (const director of directionUsers) {
          const { error: notifyError } = await supabase.functions.invoke('workflow-notification', {
            body: {
              orderId: 'automation-summary',
              recipientUserId: director.id,
              notificationType: 'automation_summary',
              title: '⚠️ Alertes critiques détectées',
              message: `${stats.criticalAlerts} alertes critiques et ${stats.errorAlerts} erreurs nécessitent votre attention immédiate.`,
              priority: stats.criticalAlerts > 0 ? 'urgent' : 'high'
            }
          });

          if (notifyError) {
            console.warn(`Failed to notify director ${director.name}:`, notifyError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        stats,
        message: 'Workflow automation completed successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ Error in workflow automation function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});