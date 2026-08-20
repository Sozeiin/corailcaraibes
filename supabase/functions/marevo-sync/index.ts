import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import {
  adminClient,
  callMarevo,
  endpointUrl,
  getConfig,
  hasApi,
  apiList,
  apiGet,
  apiUpdate,
  logSync,
  type Admin,
  type MarevoConfig,
} from '../_shared/marevo.ts';
import { applyBooking, cancelBooking } from '../_shared/marevoBooking.ts';

/**
 * OUTBOUND: Corail Caraïbes -> Marevo Booking.
 * Marevo sends bookings (see marevo-webhook). Corail sends back the
 * check-in / check-out realised by the technicians, plus boat updates.
 */
const BodySchema = z.object({
  action: z.enum([
    'test_connection',
    'push_checkin',
    'push_checkout',
    'push_boat',
    'sync_all',
    'pull_bookings',
  ]),
  days_ahead: z.number().int().min(1).max(365).optional(),
  form_id: z.string().uuid().optional(),
  rental_id: z.string().uuid().optional(),
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

async function latestChecklist(admin: Admin, boatId: string, type: 'checkin' | 'checkout') {
  const { data } = await admin
    .from('boat_checklists')
    .select('id, checklist_date, overall_status, general_notes, technician_name, customer_name, created_at, engine_hours_snapshot')
    .eq('boat_id', boatId)
    .eq('checklist_type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ---------------------------------------------------------------------------
async function pushCheckin(admin: Admin, cfg: MarevoConfig, formId: string) {
  const { data: form, error } = await admin
    .from('administrative_checkin_forms')
    .select(
      'id, marevo_booking_id, boat_id, base_id, planned_start_date, planned_end_date, rental_notes, used_at, status, customers!administrative_checkin_forms_customer_id_fkey(first_name, last_name, email, phone), boats!administrative_checkin_forms_boat_id_fkey(id, name, model), bases!administrative_checkin_forms_base_id_fkey(name)',
    )
    .eq('id', formId)
    .maybeSingle();
  if (error) throw error;
  if (!form) return { success: false, error: 'form_not_found' };

  if (!cfg.sync_bookings_enabled) {
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'outbound',
      endpoint: 'checkin.completed',
      entity_type: 'checkin',
      entity_id: formId,
      status: 'skipped',
      error_message: 'sync_bookings_enabled = false',
    });
    return { success: true, skipped: true };
  }

  const row = form as Record<string, any>;
  const checklist = row.boat_id ? await latestChecklist(admin, row.boat_id, 'checkin') : null;

  const payload: Record<string, unknown> = {
    event: 'checkin.completed',
    tenant_id: cfg.marevo_tenant_id ?? undefined,
    booking_id: row.marevo_booking_id ?? undefined,
    checkin_form_id: row.id,
    boat_external_id: row.boat_id ?? undefined,
    boat_name: row.boats?.name ?? undefined,
    base_name: row.bases?.name ?? undefined,
    customer_first_name: row.customers?.first_name ?? undefined,
    customer_last_name: row.customers?.last_name ?? undefined,
    customer_email: row.customers?.email ?? undefined,
    customer_phone: row.customers?.phone ?? undefined,
    planned_start_date: row.planned_start_date ?? undefined,
    planned_end_date: row.planned_end_date ?? undefined,
    completed_at: row.used_at ?? new Date().toISOString(),
    technician_name: checklist?.technician_name ?? undefined,
    checklist_id: checklist?.id ?? undefined,
    overall_status: checklist?.overall_status ?? undefined,
    notes: checklist?.general_notes ?? row.rental_notes ?? undefined,
    engine_hours: checklist?.engine_hours_snapshot ?? undefined,
  };

  const url = endpointUrl(cfg.marevo_base_url, '/checkin-completed');
  const res = await callMarevo(cfg, url, 'POST', payload);

  const written = await writeBackBooking(admin, cfg, row.marevo_booking_id ?? null, 'checkin', payload);

  if (res.ok || written) {
    await admin
      .from('administrative_checkin_forms')
      .update({ marevo_synced_at: new Date().toISOString() })
      .eq('id', formId);
  }

  await logSync(admin, {
    tenant_id: cfg.marevo_tenant_id,
    direction: 'outbound',
    endpoint: 'checkin.completed',
    entity_type: 'checkin',
    entity_id: formId,
    request_payload: payload,
    response_payload: (res.data ?? null) as Record<string, unknown> | null,
    http_status: res.status,
    status: res.ok ? 'success' : 'error',
    error_message: res.ok ? null : readableError(res.status, res.error),
    attempt: res.attempt,
    external_id: row.marevo_booking_id ?? null,
  });

  return { success: res.ok, status: res.status, error: res.ok ? undefined : readableError(res.status, res.error) };
}

// ---------------------------------------------------------------------------
async function pushCheckout(admin: Admin, cfg: MarevoConfig, rentalId: string) {
  const { data: rental, error } = await admin
    .from('boat_rentals')
    .select(
      'id, boat_id, customer_name, customer_email, customer_phone, start_date, end_date, status, notes, marevo_checkin_form_id, boats(id, name, model), bases(name)',
    )
    .eq('id', rentalId)
    .maybeSingle();
  if (error) throw error;
  if (!rental) return { success: false, error: 'rental_not_found' };

  if (!cfg.sync_bookings_enabled) {
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'outbound',
      endpoint: 'checkout.completed',
      entity_type: 'checkout',
      entity_id: rentalId,
      status: 'skipped',
      error_message: 'sync_bookings_enabled = false',
    });
    return { success: true, skipped: true };
  }

  const row = rental as Record<string, any>;
  const checklist = row.boat_id ? await latestChecklist(admin, row.boat_id, 'checkout') : null;

  // Retrieve the Marevo booking reference through the linked check-in form
  let bookingRef: string | null = row.marevo_checkin_form_id ?? null;
  if (!bookingRef && row.customer_email) {
    const { data: form } = await admin
      .from('administrative_checkin_forms')
      .select('marevo_booking_id')
      .eq('boat_id', row.boat_id)
      .not('marevo_booking_id', 'is', null)
      .order('used_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    bookingRef = (form as Record<string, any> | null)?.marevo_booking_id ?? null;
  }

  const payload: Record<string, unknown> = {
    event: row.status === 'cancelled' ? 'booking.cancelled' : 'checkout.completed',
    tenant_id: cfg.marevo_tenant_id ?? undefined,
    booking_id: bookingRef ?? undefined,
    rental_id: row.id,
    boat_external_id: row.boat_id ?? undefined,
    boat_name: row.boats?.name ?? undefined,
    base_name: row.bases?.name ?? undefined,
    customer_name: row.customer_name ?? undefined,
    customer_email: row.customer_email ?? undefined,
    customer_phone: row.customer_phone ?? undefined,
    start_date: row.start_date ?? undefined,
    end_date: row.end_date ?? undefined,
    status: row.status,
    completed_at: new Date().toISOString(),
    technician_name: checklist?.technician_name ?? undefined,
    checklist_id: checklist?.id ?? undefined,
    overall_status: checklist?.overall_status ?? undefined,
    notes: checklist?.general_notes ?? row.notes ?? undefined,
    engine_hours: checklist?.engine_hours_snapshot ?? undefined,
  };

  const url = endpointUrl(cfg.marevo_base_url, '/checkout-completed');
  const res = await callMarevo(cfg, url, 'POST', payload);

  const written = await writeBackBooking(admin, cfg, bookingRef, 'checkout', payload);

  if (res.ok || written) {
    await admin.from('boat_rentals').update({ marevo_synced_at: new Date().toISOString() }).eq('id', rentalId);
  }

  await logSync(admin, {
    tenant_id: cfg.marevo_tenant_id,
    direction: 'outbound',
    endpoint: 'checkout.completed',
    entity_type: 'checkout',
    entity_id: rentalId,
    request_payload: payload,
    response_payload: (res.data ?? null) as Record<string, unknown> | null,
    http_status: res.status,
    status: res.ok ? 'success' : 'error',
    error_message: res.ok ? null : readableError(res.status, res.error),
    attempt: res.attempt,
    external_id: bookingRef,
  });

  return { success: res.ok, status: res.status, error: res.ok ? undefined : readableError(res.status, res.error) };
}

// ---------------------------------------------------------------------------
async function pushBoat(admin: Admin, cfg: MarevoConfig, boatId: string, action: 'create' | 'update' | 'delete') {
  if (!cfg.sync_boats_enabled) {
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'outbound',
      endpoint: 'boat.sync',
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
    tenant_id: cfg.marevo_tenant_id ?? undefined,
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
    endpoint: 'boat.sync',
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
/** Writes the completed check-in / check-out back onto the Marevo Booking record. */
async function writeBackBooking(
  admin: Admin,
  cfg: MarevoConfig,
  bookingRef: string | null,
  entityType: 'checkin' | 'checkout',
  data: Record<string, unknown>,
) {
  if (!bookingRef || !hasApi(cfg)) return null;
  const patch: Record<string, unknown> =
    entityType === 'checkin'
      ? { marevo_checkin_data: data, marevo_sync_status: 'success', marevo_sync_error: null }
      : { marevo_checkout_data: data, marevo_sync_status: 'success', marevo_sync_error: null };
  if (entityType === 'checkin' && typeof data.checkin_form_id === 'string') {
    patch.marevo_checkin_id = data.checkin_form_id;
  }

  const res = await apiUpdate(cfg, 'Booking', bookingRef, patch);
  await logSync(admin, {
    tenant_id: cfg.marevo_tenant_id,
    direction: 'outbound',
    endpoint: `api:PUT /entities/Booking/${bookingRef}`,
    entity_type: entityType,
    entity_id: (data.checkin_form_id as string | undefined) ?? (data.rental_id as string | undefined) ?? null,
    request_payload: patch,
    response_payload: (res.data ?? null) as Record<string, unknown> | null,
    http_status: res.status,
    status: res.ok ? 'success' : 'error',
    error_message: res.ok ? null : readableError(res.status, res.error),
    attempt: res.attempt,
    external_id: bookingRef,
  });
  return res.ok;
}

// ---------------------------------------------------------------------------
/** Reads upcoming bookings from the Marevo Booking API and builds the check-in forms. */
async function pullBookings(admin: Admin, cfg: MarevoConfig, daysAhead = 60) {
  if (!hasApi(cfg)) {
    return { success: false, error: "API Marevo Booking non configurée (URL de l'API + clé API)." };
  }

  const q: Record<string, unknown> = {};
  if (cfg.marevo_tenant_id) q.tenant_id = cfg.marevo_tenant_id;
  const res = await apiList(cfg, 'Booking', q, 200, '-updated_date');

  if (!res.ok || !Array.isArray(res.data)) {
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'inbound',
      endpoint: 'api:GET /entities/Booking',
      entity_type: 'booking',
      response_payload: (res.data ?? null) as Record<string, unknown> | null,
      http_status: res.status,
      status: 'error',
      error_message: readableError(res.status, res.error),
      attempt: res.attempt,
    });
    return { success: false, error: readableError(res.status, res.error) };
  }

  const horizon = Date.now() + daysAhead * 86400000;
  const boatCache = new Map<string, { id: string | null; name: string | null }>();
  const clientCache = new Map<string, Record<string, any>>();
  let imported = 0;
  let cancelledCount = 0;
  let skipped = 0;

  for (const raw of res.data as Record<string, any>[]) {
    try {
      const status = (raw.status ?? '').toLowerCase();
      const end = raw.end_date ? new Date(raw.end_date).getTime() : null;
      const start = raw.start_date ? new Date(raw.start_date).getTime() : null;
      if (start && start > horizon) { skipped += 1; continue; }
      if (end && end < Date.now() - 7 * 86400000) { skipped += 1; continue; }

      if (status === 'cancelled' || status === 'archived') {
        const formId = await cancelBooking(admin, raw.id as string);
        if (formId) cancelledCount += 1;
        else skipped += 1;
        continue;
      }
      if (!['confirmed', 'in_progress', 'option'].includes(status)) { skipped += 1; continue; }

      // Boat: Marevo Boat.marevo_boat_id holds the Corail boat UUID
      let boatCorailId: string | null = null;
      let boatName: string | null = null;
      if (raw.boat_id) {
        const cached = boatCache.get(raw.boat_id);
        if (cached) {
          boatCorailId = cached.id;
          boatName = cached.name;
        } else {
          const b = await apiGet(cfg, 'Boat', raw.boat_id as string);
          const boat = (b.ok ? b.data : null) as Record<string, any> | null;
          boatCorailId = (boat?.marevo_boat_id as string | undefined) ?? null;
          boatName = (boat?.name as string | undefined) ?? null;
          boatCache.set(raw.boat_id, { id: boatCorailId, name: boatName });
        }
      }

      // Client
      let client: Record<string, any> | null = null;
      if (raw.client_id) {
        client = clientCache.get(raw.client_id) ?? null;
        if (!client) {
          const c = await apiGet(cfg, 'Client', raw.client_id as string);
          client = (c.ok ? (c.data as Record<string, any>) : null);
          if (client) clientCache.set(raw.client_id, client);
        }
      }

      const result = await applyBooking(admin, {
        booking_ref: raw.id as string,
        customer_first_name: raw.end_client_first_name ?? client?.first_name ?? null,
        customer_last_name: raw.end_client_last_name ?? client?.last_name ?? null,
        customer_email: raw.end_client_email ?? client?.email ?? null,
        customer_phone: raw.end_client_phone ?? client?.phone ?? client?.mobile ?? null,
        customer_address: client?.address ?? client?.address_line1 ?? null,
        customer_city: client?.city ?? null,
        customer_postal_code: client?.postal_code ?? null,
        customer_country: client?.country ?? null,
        boat_external_id: boatCorailId,
        boat_name: boatName,
        planned_start_date: raw.start_date ?? null,
        planned_end_date: raw.end_date ?? null,
        rental_notes: raw.internal_notes ?? null,
        special_instructions: raw.special_requests ?? null,
      });
      imported += 1;

      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'inbound',
        endpoint: 'api:GET /entities/Booking',
        entity_type: 'booking',
        entity_id: result.checkin_form_id,
        response_payload: result as unknown as Record<string, unknown>,
        http_status: 200,
        status: 'success',
        external_id: raw.id as string,
      });
    } catch (e) {
      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'inbound',
        endpoint: 'api:GET /entities/Booking',
        entity_type: 'booking',
        status: 'error',
        error_message: (e as Error).message,
        external_id: (raw.id as string) ?? null,
      });
    }
  }

  await admin.from('marevo_integration_config').update({ last_sync_at: new Date().toISOString() }).eq('id', cfg.id);
  return { success: true, imported, cancelled: cancelledCount, skipped };
}

// ---------------------------------------------------------------------------
async function testConnection(admin: Admin, cfg: MarevoConfig) {
  if (hasApi(cfg)) {
    const api = await apiList(cfg, 'Booking', cfg.marevo_tenant_id ? { tenant_id: cfg.marevo_tenant_id } : undefined, 1);
    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'outbound',
      endpoint: 'api:GET /entities/Booking',
      entity_type: 'booking',
      response_payload: (api.data ?? null) as Record<string, unknown> | null,
      http_status: api.status,
      status: api.ok ? 'success' : 'error',
      error_message: api.ok ? null : readableError(api.status, api.error),
      attempt: api.attempt,
    });
    if (api.ok) {
      const count = Array.isArray(api.data) ? api.data.length : 0;
      return {
        success: true,
        status: api.status,
        message: `API Marevo Booking joignable (HTTP ${api.status}, ${count} réservation lue).`,
      };
    }
    return { success: false, status: api.status, message: readableError(api.status, api.error) };
  }

  const url = endpointUrl(cfg.marevo_base_url, '/ping');
  const res = await callMarevo(cfg, url, 'POST', {
    event: 'ping',
    source: 'corail-caraibes',
    tenant_id: cfg.marevo_tenant_id ?? undefined,
  });

  await logSync(admin, {
    tenant_id: cfg.marevo_tenant_id,
    direction: 'outbound',
    endpoint: 'ping',
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
/** Re-sends the check-ins / check-outs that were never acknowledged by Marevo. */
async function syncAll(admin: Admin, cfg: MarevoConfig) {
  let pushed = 0;
  let failed = 0;

  const pulled = hasApi(cfg) ? await pullBookings(admin, cfg) : null;

  const { data: forms } = await admin
    .from('administrative_checkin_forms')
    .select('id')
    .eq('status', 'used')
    .is('marevo_synced_at', null)
    .order('used_at', { ascending: false })
    .limit(50);

  for (const f of forms ?? []) {
    const out = await pushCheckin(admin, cfg, f.id as string);
    out.success ? (pushed += 1) : (failed += 1);
  }

  const { data: rentals } = await admin
    .from('boat_rentals')
    .select('id')
    .eq('status', 'completed')
    .is('marevo_synced_at', null)
    .order('updated_at', { ascending: false })
    .limit(50);

  for (const r of rentals ?? []) {
    const out = await pushCheckout(admin, cfg, r.id as string);
    out.success ? (pushed += 1) : (failed += 1);
  }

  await admin.from('marevo_integration_config').update({ last_sync_at: new Date().toISOString() }).eq('id', cfg.id);

  return { success: true, pushed, failed, imported: pulled?.imported ?? 0 };
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, form_id, rental_id, boat_id, boat_action } = parsed.data;

    const admin = adminClient();
    const cfg = await getConfig(admin);
    if (!cfg || (!cfg.marevo_base_url && !hasApi(cfg))) return json({ success: false, error: 'no_configuration' }, 200);

    if (action !== 'test_connection' && !cfg.sync_enabled) {
      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'outbound',
        endpoint: action,
        entity_type: 'checkin',
        entity_id: form_id ?? rental_id ?? boat_id ?? null,
        status: 'skipped',
        error_message: 'sync_enabled = false',
      });
      return json({ success: true, skipped: true, reason: 'sync_disabled' });
    }

    switch (action) {
      case 'test_connection':
        return json(await testConnection(admin, cfg));
      case 'push_checkin':
        if (!form_id) return json({ error: 'form_id required' }, 400);
        return json(await pushCheckin(admin, cfg, form_id));
      case 'push_checkout':
        if (!rental_id) return json({ error: 'rental_id required' }, 400);
        return json(await pushCheckout(admin, cfg, rental_id));
      case 'push_boat':
        if (!boat_id) return json({ error: 'boat_id required' }, 400);
        return json(await pushBoat(admin, cfg, boat_id, boat_action ?? 'update'));
      case 'sync_all':
        return json(await syncAll(admin, cfg));
      case 'pull_bookings':
        return json(await pullBookings(admin, cfg, parsed.data.days_ahead ?? 60));
    }
  } catch (e) {
    console.error('marevo-sync error', (e as Error).message);
    return json({ success: false, error: 'unexpected_error' }, 500);
  }
});
