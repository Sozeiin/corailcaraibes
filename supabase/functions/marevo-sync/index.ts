import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import {
  adminClient,
  callMarevo,
  endpointUrl,
  getConfig,
  isWebhookStyle,
  logSync,
  splitName,
  type Admin,
  type MarevoConfig,
} from '../_shared/marevo.ts';

const BodySchema = z.object({
  action: z.enum(['test_connection', 'push_booking', 'push_boat', 'pull_checkin_status', 'sync_all']),
  booking_id: z.string().uuid().optional(),
  boat_id: z.string().uuid().optional(),
  boat_action: z.enum(['create', 'update', 'delete']).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function readableError(status: number, fallback?: string): string {
  if (status === 401) return 'Clé API invalide ou révoquée (401).';
  if (status === 403) return 'Accès refusé par Marevo (403).';
  if (status === 404) return "URL Marevo introuvable (404) — vérifiez l'adresse.";
  if (status === 409) return 'Entité déjà existante côté Marevo (409).';
  if (status === 0) return `Marevo inaccessible : ${fallback ?? 'erreur réseau'}.`;
  return fallback ?? `Erreur Marevo (HTTP ${status}).`;
}

function mapRemoteStatus(raw?: string | null): string | null {
  const key = (raw ?? '').toLowerCase();
  if (!key) return null;
  if (key.includes('cancel')) return 'cancelled';
  if (key.includes('complete') || key.includes('finish') || key.includes('checkout')) return 'completed';
  if (key.includes('used') || key.includes('start') || key.includes('active')) return 'active';
  return null;
}

// ---------------------------------------------------------------------------
async function pushBooking(admin: Admin, cfg: MarevoConfig, bookingId: string) {
  const { data: rental, error } = await admin
    .from('boat_rentals')
    .select(
      'id, customer_name, customer_email, customer_phone, start_date, end_date, notes, status, marevo_checkin_form_id, boat_id, base_id, boats(id, name, model), bases(name)',
    )
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  if (!rental) return { success: false, error: 'booking_not_found' };

  if (!cfg.sync_bookings_enabled) {
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'outbound',
      endpoint: 'create-checkin-from-booking',
      entity_type: 'booking',
      entity_id: bookingId,
      status: 'skipped',
      error_message: 'sync_bookings_enabled = false',
    });
    return { success: true, skipped: true };
  }

  const boat = (rental as Record<string, any>).boats;
  const base = (rental as Record<string, any>).bases;
  const { first, last } = splitName(rental.customer_name ?? '');

  const payload: Record<string, unknown> = {
    event: 'checkin.create',
    customer_first_name: first,
    customer_last_name: last,
    customer_email: rental.customer_email ?? undefined,
    customer_phone: rental.customer_phone ?? undefined,
    planned_start_date: rental.start_date,
    planned_end_date: rental.end_date,
    boat_name: boat?.name ?? undefined,
    boat_external_id: rental.boat_id,
    base_name: base?.name ?? undefined,
    rental_notes: rental.notes ?? undefined,
    special_instructions: undefined,
  };

  const url = endpointUrl(cfg.marevo_base_url, '/create-checkin-from-booking');
  const res = await callMarevo(cfg, url, 'POST', payload, async (attempt) => {
    if (!attempt.ok) {
      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'outbound',
        endpoint: 'create-checkin-from-booking',
        entity_type: 'booking',
        entity_id: bookingId,
        request_payload: payload,
        response_payload: attempt.data as Record<string, unknown>,
        http_status: attempt.status,
        status: 'error',
        error_message: readableError(attempt.status, attempt.error),
        attempt: attempt.attempt,
      });
    }
  });

  const data = (res.data ?? {}) as Record<string, unknown>;
  const formId = (data.checkin_form_id ?? data.id ?? null) as string | null;

  if (res.ok) {
    await admin
      .from('boat_rentals')
      .update({
        marevo_checkin_form_id: formId ?? rental.marevo_checkin_form_id,
        marevo_synced_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'outbound',
      endpoint: 'create-checkin-from-booking',
      entity_type: 'booking',
      entity_id: bookingId,
      request_payload: payload,
      response_payload: data,
      http_status: res.status,
      status: 'success',
      attempt: res.attempt,
      external_id: formId,
    });
  }

  return { success: res.ok, status: res.status, checkin_form_id: formId, error: res.ok ? undefined : readableError(res.status, res.error) };
}

// ---------------------------------------------------------------------------
async function pushBoat(admin: Admin, cfg: MarevoConfig, boatId: string, action: 'create' | 'update' | 'delete') {
  if (!cfg.sync_boats_enabled) {
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'outbound',
      endpoint: 'sync-boats',
      entity_type: 'boat',
      entity_id: boatId,
      status: 'skipped',
      error_message: 'sync_boats_enabled = false',
    });
    return { success: true, skipped: true };
  }

  const { data: boat } = await admin
    .from('boats')
    .select('id, name, model, year, serial_number, status, bases(name)')
    .eq('id', boatId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    event: 'boat.sync',
    action,
    external_id: boatId,
    name: boat?.name ?? undefined,
    model: boat?.model ?? undefined,
    year: boat?.year ?? undefined,
    hin: boat?.serial_number ?? undefined,
    base_name: (boat as Record<string, any> | null)?.bases?.name ?? undefined,
    status: action === 'delete' ? 'out_of_service' : (boat?.status ?? 'available'),
  };

  const url = endpointUrl(cfg.marevo_base_url, '/sync-boats');
  const res = await callMarevo(cfg, url, 'POST', payload);

  await logSync(admin, {
    tenant_id: cfg.marevo_tenant_id,
    direction: 'outbound',
    endpoint: 'sync-boats',
    entity_type: 'boat',
    entity_id: boatId,
    request_payload: payload,
    response_payload: (res.data ?? null) as Record<string, unknown> | null,
    http_status: res.status,
    status: res.ok ? 'success' : 'error',
    error_message: res.ok ? null : readableError(res.status, res.error),
    attempt: res.attempt,
    external_id: boatId,
  });

  return { success: res.ok, status: res.status, error: res.ok ? undefined : readableError(res.status, res.error) };
}

// ---------------------------------------------------------------------------
async function pullCheckinStatus(admin: Admin, cfg: MarevoConfig) {
  if (isWebhookStyle(cfg.marevo_base_url)) {
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'inbound',
      endpoint: 'get-checkin-status',
      entity_type: 'checkin',
      status: 'skipped',
      error_message: "URL de type webhook : la lecture des statuts se fait via les webhooks entrants.",
    });
    return { success: true, skipped: true, updated: 0 };
  }

  const query: Record<string, string> = { limit: '500', include_checklist: 'false' };
  if (cfg.last_sync_at) query.updated_since = cfg.last_sync_at;
  const url = endpointUrl(cfg.marevo_base_url, '/get-checkin-status', query);
  const res = await callMarevo(cfg, url, 'GET');

  if (!res.ok) {
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'inbound',
      endpoint: 'get-checkin-status',
      entity_type: 'checkin',
      response_payload: (res.data ?? null) as Record<string, unknown> | null,
      http_status: res.status,
      status: 'error',
      error_message: readableError(res.status, res.error),
      attempt: res.attempt,
    });
    return { success: false, error: readableError(res.status, res.error) };
  }

  const body = (res.data ?? {}) as Record<string, unknown>;
  const forms = (Array.isArray(body.data) ? body.data : Array.isArray(body.forms) ? body.forms : []) as Record<string, unknown>[];

  let updated = 0;
  for (const form of forms) {
    const formId = (form.id ?? form.checkin_form_id) as string | undefined;
    const newStatus = mapRemoteStatus(form.status as string | undefined);
    if (!newStatus) continue;

    let query = admin.from('boat_rentals').update({ status: newStatus, updated_at: new Date().toISOString() });
    if (formId) {
      query = query.eq('marevo_checkin_form_id', formId);
    } else if (form.customer_email && form.planned_start_date) {
      query = query
        .eq('customer_email', form.customer_email as string)
        .eq('start_date', form.planned_start_date as string);
    } else {
      continue;
    }
    const { error } = await query;
    if (!error) updated += 1;
  }

  await admin
    .from('marevo_integration_config')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', cfg.id);

  await logSync(admin, {
    tenant_id: cfg.marevo_tenant_id,
    direction: 'inbound',
    endpoint: 'get-checkin-status',
    entity_type: 'checkin',
    response_payload: { received: forms.length, updated },
    http_status: res.status,
    status: 'success',
    attempt: res.attempt,
  });

  return { success: true, received: forms.length, updated };
}

// ---------------------------------------------------------------------------
async function testConnection(admin: Admin, cfg: MarevoConfig) {
  const webhookStyle = isWebhookStyle(cfg.marevo_base_url);
  const url = endpointUrl(cfg.marevo_base_url, '/get-checkin-status', { limit: '1' });
  const res = webhookStyle
    ? await callMarevo(cfg, url, 'POST', { event: 'ping', source: 'corail-caraibes' })
    : await callMarevo(cfg, url, 'GET');

  await logSync(admin, {
    tenant_id: cfg.marevo_tenant_id,
    direction: 'outbound',
    endpoint: webhookStyle ? 'webhook:ping' : 'get-checkin-status',
    entity_type: 'checkin',
    response_payload: (res.data ?? null) as Record<string, unknown> | null,
    http_status: res.status,
    status: res.ok ? 'success' : 'error',
    error_message: res.ok ? null : readableError(res.status, res.error),
    attempt: res.attempt,
  });

  return {
    success: res.ok,
    status: res.status,
    message: res.ok ? `Connexion réussie (HTTP ${res.status}).` : readableError(res.status, res.error),
  };
}

// ---------------------------------------------------------------------------
async function syncAll(admin: Admin, cfg: MarevoConfig) {
  const results: Record<string, unknown> = { pushed: 0, failed: 0 };

  if (cfg.sync_bookings_enabled) {
    const { data: rentals } = await admin
      .from('boat_rentals')
      .select('id')
      .is('marevo_checkin_form_id', null)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(50);

    for (const r of rentals ?? []) {
      const out = await pushBooking(admin, cfg, r.id as string);
      if (out.success) results.pushed = (results.pushed as number) + 1;
      else results.failed = (results.failed as number) + 1;
    }
  }

  results.pull = await pullCheckinStatus(admin, cfg);
  return { success: true, ...results };
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, booking_id, boat_id, boat_action } = parsed.data;

    const admin = adminClient();
    const cfg = await getConfig(admin);
    if (!cfg || !cfg.marevo_base_url) return json({ success: false, error: 'no_configuration' }, 200);

    if (action !== 'test_connection' && !cfg.sync_enabled) {
      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'outbound',
        endpoint: action,
        entity_type: 'checkin',
        entity_id: booking_id ?? boat_id ?? null,
        status: 'skipped',
        error_message: 'sync_enabled = false',
      });
      return json({ success: true, skipped: true, reason: 'sync_disabled' });
    }

    switch (action) {
      case 'test_connection':
        return json(await testConnection(admin, cfg));
      case 'push_booking':
        if (!booking_id) return json({ error: 'booking_id required' }, 400);
        return json(await pushBooking(admin, cfg, booking_id));
      case 'push_boat':
        if (!boat_id) return json({ error: 'boat_id required' }, 400);
        return json(await pushBoat(admin, cfg, boat_id, boat_action ?? 'update'));
      case 'pull_checkin_status':
        return json(await pullCheckinStatus(admin, cfg));
      case 'sync_all':
        return json(await syncAll(admin, cfg));
    }
  } catch (e) {
    console.error('marevo-sync error', (e as Error).message);
    return json({ success: false, error: 'unexpected_error' }, 500);
  }
});
