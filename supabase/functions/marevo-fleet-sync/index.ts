import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { adminClient, getConfig, logSync } from '../_shared/marevo.ts';
import { resolveBoat } from '../_shared/marevoBooking.ts';

const BoatSchema = z.object({
  id: z.string().max(120).optional().nullable(),
  marevo_boat_id: z.string().max(120).optional().nullable(),
  corail_boat_id: z.string().max(120).optional().nullable(),
  boat_id: z.string().max(120).optional().nullable(),
  boat_external_id: z.string().max(120).optional().nullable(),
  name: z.string().max(160).optional().nullable(),
  boat_name: z.string().max(160).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
});

const BodySchema = z.object({
  event: z.string().max(100).optional().nullable(),
  tenant_id: z.string().max(100).optional().nullable(),
  boats: z.array(BoatSchema).min(1).max(500).optional(),
  boat: BoatSchema.optional(),
}).and(BoatSchema.partial());

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = adminClient();
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;
    const cfg = await getConfig(admin);
    const params = new URL(req.url).searchParams;
    const candidates = [
      req.headers.get('x-webhook-secret'),
      req.headers.get('x-api-key'),
      req.headers.get('x-corail-key'),
      req.headers.get('x-corail-api-key'),
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null,
      ...params.values(),
    ]
      .filter((value): value is string => !!value)
      .map((value) => value.trim());

    if (!cfg?.webhook_secret || !candidates.includes(cfg.webhook_secret.trim())) {
      return json({
        error: 'unauthorized',
        hint: 'Clé Corail attendue dans ?token=… ou x-api-key (clé commençant par cc_)',
        expected_key_prefix: cfg?.webhook_secret ? cfg.webhook_secret.slice(0, 8) + '…' : null,
        received_cc_key_prefixes: candidates.filter((c) => c.startsWith('cc_')).map((c) => c.slice(0, 8) + '…'),
      }, 401);
    }

    if (cfg.marevo_tenant_id && body.tenant_id && body.tenant_id !== cfg.marevo_tenant_id) {
      return json({ error: 'tenant_mismatch' }, 403);
    }

    const topLevelBoat = BoatSchema.safeParse(body).success ? BoatSchema.parse(body) : null;
    const received = body.boats ?? (body.boat ? [body.boat] : topLevelBoat ? [topLevelBoat] : []);
    if (!received.length) return json({ error: 'boats_required' }, 400);

    const results = [];
    for (const item of received) {
      const receivedId = item.marevo_boat_id ?? item.corail_boat_id ?? item.boat_id ?? item.boat_external_id ?? item.id ?? null;
      const receivedName = item.name ?? item.boat_name ?? null;
      const boat = await resolveBoat(admin, {
        booking_ref: null,
        boat_external_id: receivedId,
        boat_name: receivedName,
      });
      let applied = false;
      let updateError: string | null = null;
      if (boat && item.status) {
        const { error } = await admin
          .from('boats')
          .update({ status: item.status, updated_at: new Date().toISOString() })
          .eq('id', boat.id);
        applied = !error;
        updateError = error?.message ?? null;
      } else if (boat) {
        applied = true;
      }
      results.push({
        boat_name: receivedName ?? boat?.name ?? null,
        boat_id: boat?.id ?? null,
        marevo_boat_id: boat?.id ?? null,
        id: boat?.id ?? null,
        received_id: receivedId,
        applied,
        error: updateError,
      });
    }

    const matched = results.filter((result) => result.boat_id).length;
    const unmatched = results
      .filter((result) => !result.boat_id)
      .map((result) => ({ boat_name: result.boat_name, received_id: result.received_id }));
    const failed = results.filter((result) => result.boat_id && !result.applied).length;

    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'inbound',
      endpoint: 'marevo-fleet-sync',
      entity_type: 'boat',
      entity_id: results.length === 1 ? results[0]?.boat_id ?? null : null,
      request_payload: { ...body, tenant_id: undefined },
      response_payload: { results, unmatched },
      http_status: failed ? 500 : 200,
      status: failed ? 'error' : matched ? 'success' : 'skipped',
      error_message: failed
        ? `${failed} mise(s) à jour échouée(s)`
        : unmatched.length
          ? `Bateaux non appariés : ${unmatched.map((item) => item.boat_name ?? item.received_id ?? '?').join(', ')}`
          : null,
    });

    const singleBoatId = results.length === 1 ? results[0]?.boat_id ?? null : null;
    return json({
      success: failed === 0,
      marevo_boat_id: singleBoatId,
      boat_id: singleBoatId,
      id: singleBoatId,
      matched,
      total: results.length,
      unmatched,
      results,
    }, failed ? 500 : 200);
  } catch (error) {
    console.error('marevo-fleet-sync error', (error as Error).message);
    return json({ success: false, error: 'unexpected_error' }, 500);
  }
});