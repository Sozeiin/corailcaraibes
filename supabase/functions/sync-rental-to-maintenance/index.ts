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
  rental_id: z.string().uuid().optional(),
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
  let logId: string | null = null;

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const rentalId = parsed.data.rental_id ?? parsed.data.entity_id;
    if (!rentalId) return json({ error: { rental_id: ['requis'] } }, 400);
    logId = parsed.data.log_id ?? null;
    const action = parsed.data.action ?? 'create';

    const { data: rental, error: rentalError } = await admin
      .from('boat_rentals')
      .select('*')
      .eq('id', rentalId)
      .maybeSingle();

    if (rentalError) throw rentalError;
    if (!rental) {
      await upsertSyncLog(admin, {
        log_id: logId,
        entity_type: 'rental',
        entity_id: rentalId,
        action,
        status: 'failed',
        last_error: 'rental_not_found',
      });
      return json({ success: false, error: 'rental_not_found' }, 200);
    }

    const creds = await getIntegration(admin);
    if (!creds) {
      await upsertSyncLog(admin, {
        log_id: logId,
        tenant_id: rental.base_id,
        entity_type: 'rental',
        entity_id: rentalId,
        action,
        status: 'failed',
        last_error: 'no_integration',
      });
      return json({ success: false, error: 'no_integration' }, 200);
    }

    // Idempotence: never send a second 'create' for an entity already synced
    const already = await findSuccessfulCreate(admin, 'rental', rentalId);
    if (action === 'create' && already) {
      await upsertSyncLog(admin, {
        log_id: logId,
        tenant_id: rental.base_id,
        entity_type: 'rental',
        entity_id: rentalId,
        action,
        status: 'success',
        external_id: already.external_id,
        response_data: { skipped: 'already_synced' },
      });
      return json({ success: true, already_exists: true, external_id: already.external_id });
    }

    const [{ data: boat }, { data: base }, { data: customer }] = await Promise.all([
      admin.from('boats').select('id, name, model, serial_number, base_id').eq('id', rental.boat_id).maybeSingle(),
      rental.base_id
        ? admin.from('bases').select('name').eq('id', rental.base_id).maybeSingle()
        : Promise.resolve({ data: null }),
      rental.customer_id
        ? admin
            .from('customers')
            .select('first_name, last_name, email, phone, notes')
            .eq('id', rental.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const customerName =
      rental.customer_name ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim() ||
      'Client';

    const payload = {
      boat_external_id: rental.boat_id,
      boat: boat?.name ?? null,
      customer_name: customerName,
      customer_email: rental.customer_email ?? customer?.email ?? null,
      customer_phone: rental.customer_phone ?? customer?.phone ?? null,
      planned_start_date: rental.start_date ? new Date(rental.start_date).toISOString() : null,
      planned_end_date: rental.end_date ? new Date(rental.end_date).toISOString() : null,
      rental_notes: rental.notes ?? null,
      special_instructions: customer?.notes ?? null,
      base_name: base?.name ?? null,
      ...(creds.integration.marevo_tenant_id ? { tenant_id: creds.integration.marevo_tenant_id } : {}),
    };

    const url = `${normalizeUrl(creds.integration.maintenance_api_url)}/create-checkin-from-booking`;
    const result = await postToMaintenance(url, creds.apiKey, payload);
    const responseData = result.data as Record<string, unknown> | null;

    if (result.ok) {
      await upsertSyncLog(admin, {
        log_id: logId,
        tenant_id: rental.base_id,
        entity_type: 'rental',
        entity_id: rentalId,
        action,
        status: 'success',
        request_payload: payload,
        response_data: responseData,
        external_id: (responseData?.checkin_form_id as string) ?? already?.external_id ?? null,
      });
      console.log('rental synced', rentalId, 'status', result.status);
      return json({ success: true, response: responseData });
    }

    const { data: current } = logId
      ? await admin.from('maintenance_sync_log').select('attempts').eq('id', logId).maybeSingle()
      : { data: null };

    await upsertSyncLog(admin, {
      log_id: logId,
      tenant_id: rental.base_id,
      entity_type: 'rental',
      entity_id: rentalId,
      action,
      status: result.retryable ? 'retrying' : 'failed',
      attempts: (current?.attempts ?? 0) + 1,
      last_error: `http_${result.status}`,
      request_payload: payload,
      response_data: responseData,
    });
    console.error('rental sync failed', rentalId, result.status);
    return json({ success: false, status: result.status, response: responseData }, 200);
  } catch (e) {
    console.error('sync-rental-to-maintenance error', (e as Error).message);
    return json({ success: false, error: 'unexpected_error' }, 200);
  }
});
