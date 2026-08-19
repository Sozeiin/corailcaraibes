import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import {
  adminClient,
  findSuccessfulCreate,
  getIntegration,
  normalizeUrl,
  postToMaintenance,
  upsertSyncLog,
} from '../_shared/maintenance.ts';

const BodySchema = z.object({
  boat_id: z.string().uuid().optional(),
  entity_id: z.string().uuid().optional(),
  log_id: z.string().uuid().optional(),
  action: z.enum(['create', 'update', 'delete']).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = adminClient();

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const boatId = parsed.data.boat_id ?? parsed.data.entity_id;
    if (!boatId) return json({ error: { boat_id: ['requis'] } }, 400);
    const logId = parsed.data.log_id ?? null;
    const action = parsed.data.action ?? 'create';

    const { data: boat } = await admin.from('boats').select('*').eq('id', boatId).maybeSingle();
    if (!boat) {
      await upsertSyncLog(admin, {
        log_id: logId,
        entity_type: 'boat',
        entity_id: boatId,
        action,
        status: 'failed',
        last_error: 'boat_not_found',
      });
      return json({ success: false, error: 'boat_not_found' }, 200);
    }

    const creds = await getIntegration(admin);
    if (!creds) {
      await upsertSyncLog(admin, {
        log_id: logId,
        tenant_id: boat.base_id,
        entity_type: 'boat',
        entity_id: boatId,
        action,
        status: 'failed',
        last_error: 'no_integration',
      });
      return json({ success: false, error: 'no_integration' }, 200);
    }

    const already = await findSuccessfulCreate(admin, 'boat', boatId);
    if (action === 'create' && already) {
      await upsertSyncLog(admin, {
        log_id: logId,
        tenant_id: boat.base_id,
        entity_type: 'boat',
        entity_id: boatId,
        action,
        status: 'success',
        external_id: already.external_id,
        response_data: { skipped: 'already_synced' },
      });
      return json({ success: true, already_exists: true });
    }

    const { data: base } = boat.base_id
      ? await admin.from('bases').select('name').eq('id', boat.base_id).maybeSingle()
      : { data: null };

    const payload = {
      external_id: boat.id,
      name: boat.name,
      model: boat.model,
      registration: boat.serial_number,
      year: boat.year,
      status: boat.status,
      base_name: base?.name ?? null,
      ...(creds.integration.marevo_tenant_id ? { tenant_id: creds.integration.marevo_tenant_id } : {}),
    };

    const url = `${normalizeUrl(creds.integration.maintenance_api_url)}/sync-boats`;
    const result = await postToMaintenance(url, creds.apiKey, payload);
    const responseData = result.data as Record<string, unknown> | null;

    if (result.ok) {
      await upsertSyncLog(admin, {
        log_id: logId,
        tenant_id: boat.base_id,
        entity_type: 'boat',
        entity_id: boatId,
        action,
        status: 'success',
        request_payload: payload,
        response_data: responseData,
        external_id: (responseData?.boat_id as string) ?? already?.external_id ?? null,
      });
      console.log('boat synced', boatId, 'status', result.status);
      return json({ success: true, response: responseData });
    }

    const { data: current } = logId
      ? await admin.from('maintenance_sync_log').select('attempts').eq('id', logId).maybeSingle()
      : { data: null };

    await upsertSyncLog(admin, {
      log_id: logId,
      tenant_id: boat.base_id,
      entity_type: 'boat',
      entity_id: boatId,
      action,
      status: result.retryable ? 'retrying' : 'failed',
      attempts: (current?.attempts ?? 0) + 1,
      last_error: `http_${result.status}`,
      request_payload: payload,
      response_data: responseData,
    });
    console.error('boat sync failed', boatId, result.status);
    return json({ success: false, status: result.status, response: responseData }, 200);
  } catch (e) {
    console.error('sync-boat-to-maintenance error', (e as Error).message);
    return json({ success: false, error: 'unexpected_error' }, 200);
  }
});
