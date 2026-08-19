import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, getIntegration, normalizeUrl, SUPABASE_URL } from '../_shared/maintenance.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ ok: false, error: 'unauthorized' }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ ok: false, error: 'unauthorized' }, 401);

    const admin = adminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profile?.role !== 'direction') return json({ ok: false, error: 'forbidden' }, 403);

    const creds = await getIntegration(admin);
    if (!creds) return json({ ok: false, error: 'no_integration' }, 200);

    const url = `${normalizeUrl(creds.integration.maintenance_api_url)}/get-checkin-status?ping=1`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'x-api-key': creds.apiKey, 'Content-Type': 'application/json' },
    });
    const text = await res.text();
    console.log('ping maintenance status', res.status);

    if (!res.ok) {
      return json({ ok: false, status: res.status, details: text.slice(0, 500) }, 200);
    }
    return json({ ok: true, status: res.status, details: text.slice(0, 500) });
  } catch (e) {
    console.error('test-maintenance-connection error', (e as Error).message);
    return json({ ok: false, error: (e as Error).message }, 200);
  }
});
