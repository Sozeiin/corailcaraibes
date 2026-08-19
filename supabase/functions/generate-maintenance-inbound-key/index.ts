import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, SUPABASE_URL } from '../_shared/maintenance.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function randomHex(bytes: number) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'unauthorized' }, 401);

    const admin = adminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profile?.role !== 'direction') return json({ error: 'forbidden' }, 403);

    const newKey = `cc_${randomHex(24)}`;
    const now = new Date().toISOString();

    const { data: existing } = await admin
      .from('maintenance_integrations')
      .select('id')
      .eq('singleton', true)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from('maintenance_integrations')
        .update({ inbound_api_key: newKey, inbound_api_key_created_at: now, updated_at: now })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from('maintenance_integrations').insert({
        singleton: true,
        maintenance_api_url: 'https://a-configurer.invalid',
        webhook_secret: randomHex(24),
        is_active: false,
        inbound_api_key: newKey,
        inbound_api_key_created_at: now,
      });
      if (error) throw error;
    }

    return json({ success: true, inbound_api_key: newKey, created_at: now });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
