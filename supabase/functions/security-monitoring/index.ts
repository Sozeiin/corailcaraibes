import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityAlert {
  type: 'rate_limit_exceeded' | 'suspicious_pattern' | 'failed_login_threshold' | 'security_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  user_id?: string;
  ip_address?: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, data } = await req.json();

    switch (action) {
      case 'analyze_security_patterns':
        return await analyzeSecurityPatterns(supabaseClient);
      
      case 'generate_security_alert':
        return await generateSecurityAlert(supabaseClient, data);
      
      case 'cleanup_old_logs':
        return await cleanupOldLogs(supabaseClient);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Security monitoring error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeSecurityPatterns(supabaseClient: any) {
  try {
    // Analyze failed login patterns (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: failedLogins, error: loginError } = await supabaseClient
      .from('login_attempts')
      .select('*')
      .eq('success', false)
      .gte('created_at', yesterday.toISOString());

    if (loginError) throw loginError;

    // Group by IP address
    const ipGroups = new Map();
    failedLogins?.forEach((attempt: any) => {
      if (attempt.ip_address) {
        const count = ipGroups.get(attempt.ip_address) || 0;
        ipGroups.set(attempt.ip_address, count + 1);
      }
    });

    // Find suspicious IPs (more than 10 failed attempts)
    const suspiciousIPs = Array.from(ipGroups.entries())
      .filter(([_, count]) => count > 10)
      .map(([ip, count]) => ({ ip, count }));

    // Analyze security events patterns
    const { data: events, error: eventsError } = await supabaseClient
      .from('security_events')
      .select('*')
      .gte('created_at', yesterday.toISOString());

    if (eventsError) throw eventsError;

    const alerts: SecurityAlert[] = [];

    // Generate alerts for suspicious IPs
    for (const { ip, count } of suspiciousIPs) {
      alerts.push({
        type: 'failed_login_threshold',
        severity: count > 50 ? 'critical' : count > 25 ? 'high' : 'medium',
        message: `Multiple failed login attempts from IP: ${ip}`,
        details: { ip_address: ip, failed_attempts: count },
        ip_address: ip,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for unusual patterns in security events
    const suspiciousEvents = events?.filter((event: any) => 
      event.event_type === 'suspicious_activity'
    ) || [];

    if (suspiciousEvents.length > 5) {
      alerts.push({
        type: 'suspicious_pattern',
        severity: 'high',
        message: `High number of suspicious activities detected: ${suspiciousEvents.length}`,
        details: { suspicious_events_count: suspiciousEvents.length },
        timestamp: new Date().toISOString(),
      });
    }

    // Store alerts if any
    if (alerts.length > 0) {
      for (const alert of alerts) {
        await supabaseClient.from('security_events').insert({
          event_type: 'security_alert',
          details: alert,
          ip_address: alert.ip_address || null,
          user_id: alert.user_id || null,
          created_at: alert.timestamp,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alerts_generated: alerts.length,
        suspicious_ips: suspiciousIPs.length,
        analysis_summary: {
          failed_logins_24h: failedLogins?.length || 0,
          unique_ips: ipGroups.size,
          security_events_24h: events?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing security patterns:', error);
    throw error;
  }
}

async function generateSecurityAlert(supabaseClient: any, alertData: SecurityAlert) {
  try {
    // Insert the security alert
    const { error } = await supabaseClient.from('security_events').insert({
      event_type: 'security_alert',
      details: alertData,
      ip_address: alertData.ip_address || null,
      user_id: alertData.user_id || null,
      created_at: alertData.timestamp,
    });

    if (error) throw error;

    // If it's a critical alert, notify administrators
    if (alertData.severity === 'critical') {
      const { data: admins } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', 'direction');

      if (admins) {
        for (const admin of admins) {
          await supabaseClient.from('notifications').insert({
            user_id: admin.id,
            type: 'security_alert',
            title: 'Alerte de Sécurité Critique',
            message: alertData.message,
            data: { alert: alertData },
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, alert_created: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating security alert:', error);
    throw error;
  }
}

async function cleanupOldLogs(supabaseClient: any) {
  try {
    // Clean up old API logs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: apiLogsError } = await supabaseClient
      .from('api_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    // Clean up old login attempts (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error: loginAttemptsError } = await supabaseClient
      .from('login_attempts')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString());

    // Clean up old security events (older than 180 days)
    const oneEightyDaysAgo = new Date();
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

    const { error: securityEventsError } = await supabaseClient
      .from('security_events')
      .delete()
      .lt('created_at', oneEightyDaysAgo.toISOString());

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleanup_completed: true,
        errors: {
          api_logs: apiLogsError?.message || null,
          login_attempts: loginAttemptsError?.message || null,
          security_events: securityEventsError?.message || null,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error cleaning up old logs:', error);
    throw error;
  }
}