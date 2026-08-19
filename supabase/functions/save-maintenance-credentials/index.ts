import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';
import { adminClient, encryptSecret, SUPABASE_URL } from '../_shared/maintenance.ts';

const BodySchema = z.object({
  maintenance_api_url: z.string().url().max(500),
  maintenance_api_key: z.string().min(10).max(500).optional(),
  webhook_secret: z.string().min(16).max(200).optional(),
  marevo_tenant_id: z.string().max(100).optional().nullable(),
  is_active: z.boolean().optional(),
});

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

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const { maintenance_api_url, maintenance_api_key, webhook_secret, marevo_tenant_id, is_active } =
      parsed.data;

    const { data: existing } = await admin
      .from('maintenance_integrations')
      .select('id, maintenance_api_key_encrypted, webhook_secret')
      .eq('singleton', true)
      .maybeSingle();

    const row: Record<string, unknown> = {
      singleton: true,
      maintenance_api_url,
      marevo_tenant_id: marevo_tenant_id ?? null,
      is_active: is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (maintenance_api_key) {
      row.maintenance_api_key_encrypted = await encryptSecret(maintenance_api_key);
    } else if (!existing?.maintenance_api_key_encrypted) {
      return json({ error: { maintenance_api_key: ['La clé API est requise'] } }, 400);
    }

    if (webhook_secret) {
      row.webhook_secret = webhook_secret;
    } else if (!existing?.webhook_secret) {
      row.webhook_secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    }

    const { error } = await admin
      .from('maintenance_integrations')
      .upsert(row, { onConflict: 'singleton' });

    if (error) {
      console.error('save credentials failed', error.message);
      return json({ error: 'save_failed' }, 500);
    }

    console.log('maintenance credentials saved by', userData.user.id);
    return json({ success: true, has_api_key: true });
  } catch (e) {
    console.error('save-maintenance-credentials error', (e as Error).message);
    return json({ error: 'unexpected_error' }, 500);
  }
});
