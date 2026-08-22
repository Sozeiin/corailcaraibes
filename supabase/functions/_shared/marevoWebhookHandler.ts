import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { adminClient, getConfig, logSync } from './marevo.ts';
import { applyBooking, cancelBooking, resolveBoat, type NormalizedBooking } from './marevoBooking.ts';

/**
 * INBOUND endpoint: Marevo Booking -> Corail Caraïbes.
 * Marevo pushes bookings (client + dates + bateau). Corail creates/updates
 * the customer file and the administrative check-in form so a technician can
 * run the check-in, then Corail pushes the completed check-in / check-out back.
 */
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
  event: z.string().min(1).max(100).optional().nullable(),
  type: z.string().min(1).max(100).optional().nullable(),
  // Optional auth passthrough (some callers put the Corail key in the body)
  token: z.string().max(200).optional().nullable(),
  api_key: z.string().max(200).optional().nullable(),
  corail_api_key: z.string().max(200).optional().nullable(),

  entity: z.string().min(1).max(100).optional().nullable(),
  boats: z.array(BoatSchema).max(500).optional(),
  tenant_id: z.string().max(100).optional().nullable(),


  // booking identity
  booking_id: z.string().max(120).optional().nullable(),
  booking_reference: z.string().max(120).optional().nullable(),
  external_id: z.string().max(120).optional().nullable(),

  // customer
  customer_first_name: z.string().max(120).optional().nullable(),
  customer_last_name: z.string().max(120).optional().nullable(),
  customer_name: z.string().max(240).optional().nullable(),
  customer_email: z.string().max(255).optional().nullable(),
  customer_phone: z.string().max(60).optional().nullable(),
  customer_address: z.string().max(255).optional().nullable(),
  customer_city: z.string().max(120).optional().nullable(),
  customer_postal_code: z.string().max(30).optional().nullable(),
  customer_country: z.string().max(120).optional().nullable(),

  // Marevo Booking native field names (Base44 Booking entity)
  end_client_first_name: z.string().max(120).optional().nullable(),
  end_client_last_name: z.string().max(120).optional().nullable(),
  end_client_email: z.string().max(255).optional().nullable(),
  end_client_phone: z.string().max(60).optional().nullable(),

  // boat + dates
  boat_external_id: z.string().max(120).optional().nullable(),
  boat_name: z.string().max(160).optional().nullable(),
  base_name: z.string().max(160).optional().nullable(),
  planned_start_date: z.string().max(40).optional().nullable(),
  planned_end_date: z.string().max(40).optional().nullable(),
  start_date: z.string().max(40).optional().nullable(),
  end_date: z.string().max(40).optional().nullable(),

  rental_notes: z.string().max(4000).optional().nullable(),
  special_instructions: z.string().max(4000).optional().nullable(),
  special_requests: z.string().max(4000).optional().nullable(),
  internal_notes: z.string().max(4000).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

type Body = z.infer<typeof BodySchema>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function expandSecretCandidates(values: Array<string | null>): string[] {
  const expanded = new Set<string>();

  for (const rawValue of values) {
    if (!rawValue) continue;

    const queue = [rawValue.trim()];
    for (let index = 0; index < queue.length && index < 8; index += 1) {
      const value = queue[index];
      if (!value || expanded.has(value)) continue;
      expanded.add(value);

      const unquoted = value.replace(/^["']+|["']+$/g, '').trim();
      if (unquoted && unquoted !== value) queue.push(unquoted);

      const withoutBearer = value.replace(/^Bearer\s+/i, '').trim();
      if (withoutBearer && withoutBearer !== value) queue.push(withoutBearer);

      try {
        const decoded = decodeURIComponent(value).trim();
        if (decoded && decoded !== value) queue.push(decoded);
      } catch { /* malformed encoding: keep the original candidate */ }

      // Some webhook builders serialize the value as JSON or paste a complete
      // `token=...` fragment instead of the bare secret.
      const embeddedKeys = value.match(/cc_[A-Za-z0-9_-]{20,200}/g) ?? [];
      queue.push(...embeddedKeys);
    }
  }

  return [...expanded];
}

/**
 * Marevo Booking sends the same information under several key spellings
 * (snake_case, camelCase, short names). Pick the first non-empty one, looking
 * both at the top-level body and at the nested `data` object.
 */
function pick(body: Body, keys: string[]): string | null {
  const raw = body as Record<string, unknown>;
  const nested = (raw.data ?? {}) as Record<string, unknown>;
  const booking = (raw.booking ?? nested.booking ?? raw.reservation ?? nested.reservation ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    for (const source of [raw, nested, booking]) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
  }
  return null;
}

function normalize(body: Body): NormalizedBooking {
  return {
    booking_ref: pick(body, [
      'booking_id', 'bookingId', 'external_id', 'externalId', 'booking_reference', 'bookingReference', 'reference',
    ]),
    customer_first_name: pick(body, [
      'customer_first_name', 'customerFirstName', 'first_name', 'firstName', 'end_client_first_name',
    ]),
    customer_last_name: pick(body, [
      'customer_last_name', 'customerLastName', 'last_name', 'lastName', 'end_client_last_name',
    ]),
    customer_name: pick(body, ['customer_name', 'customerName', 'client_name', 'name']),
    customer_email: pick(body, ['customer_email', 'customerEmail', 'email', 'end_client_email']),
    customer_phone: pick(body, [
      'customer_phone', 'customerPhone', 'phone', 'phone_number', 'phoneNumber', 'end_client_phone',
    ]),
    customer_address: pick(body, ['customer_address', 'customerAddress', 'address']),
    customer_city: pick(body, ['customer_city', 'customerCity', 'city']),
    customer_postal_code: pick(body, ['customer_postal_code', 'customerPostalCode', 'postal_code', 'zip']),
    customer_country: pick(body, ['customer_country', 'customerCountry', 'country']),
    boat_external_id: pick(body, [
      'boat_external_id', 'external_boat_id', 'externalBoatId', 'boat_id', 'boatId', 'corail_boat_id', 'marevo_boat_id',
    ]),
    boat_name: pick(body, ['boat_name', 'boatName', 'boat', 'boat_model', 'vessel_name', 'vessel']),
    base_name: pick(body, ['base_name', 'baseName', 'base', 'location', 'location_name']),
    planned_start_date: pick(body, [
      'planned_start_date', 'plannedStartDate', 'start_date', 'startDate', 'checkin_date', 'rental_start',
    ]),
    planned_end_date: pick(body, [
      'planned_end_date', 'plannedEndDate', 'end_date', 'endDate', 'checkout_date', 'rental_end',
    ]),
    rental_notes: pick(body, ['rental_notes', 'rentalNotes', 'notes', 'internal_notes']),
    special_instructions: pick(body, [
      'special_instructions', 'specialInstructions', 'special_requests', 'instructions',
    ]),
  };
}

function nestedBookingId(body: Body): string | null {
  const raw = body as Record<string, unknown>;
  const nested = (raw.data ?? {}) as Record<string, unknown>;
  const booking = (raw.booking ?? nested.booking ?? raw.reservation ?? nested.reservation) as Record<string, unknown> | undefined;
  const value = booking?.id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function handleMarevoWebhook(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = adminClient();
  let body: Body | null = null;

  try {
    // Certains appels (lecture de statut) arrivent en GET ou avec un corps vide.
    let rawBody: unknown = {};
    try {
      const text = await req.text();
      if (text.trim()) rawBody = JSON.parse(text);
    } catch { rawBody = {}; }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    body = parsed.data;


    const cfg = await getConfig(admin);
    const url = new URL(req.url);
    const params = url.searchParams;
    // Accept the Corail business key wherever the caller puts it: dedicated
    // headers, Authorization bearer, or ANY query parameter (some callers swap
    // `apikey` and `token`). We only ever compare against the stored secret.
    const headerCandidates = [
      req.headers.get('x-webhook-secret'),
      req.headers.get('x-api-key'),
      req.headers.get('api_key'),
      req.headers.get('x-corail-key'),
      req.headers.get('x-corail-api-key'),
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null,
    ];
    const queryCandidates = [...params.values()];
    const bodyCandidates = [
      (body as Record<string, unknown>).token,
      (body as Record<string, unknown>).api_key,
      (body as Record<string, unknown>).corail_api_key,
    ].map((v) => (typeof v === 'string' ? v : null));
    const candidates = expandSecretCandidates([
      ...headerCandidates,
      ...queryCandidates,
      ...bodyCandidates,
    ]);

    const acceptedSecrets = [cfg?.webhook_secret, cfg?.marevo_api_key]
      .filter((value): value is string => !!value)
      .map((value) => value.trim());
    const hasValidSecret = acceptedSecrets.some((secret) => candidates.includes(secret));

    if (!cfg || !acceptedSecrets.length || !hasValidSecret) {
      console.error('marevo-webhook rejected: invalid secret', {
        query_keys: [...params.keys()],
        cc_candidates: candidates.filter((c) => c.startsWith('cc_')).map((c) => c.slice(0, 8) + '…'),
        expected_prefix: cfg?.webhook_secret ? cfg.webhook_secret.slice(0, 8) + '…' : null,
      });
      return json({
        error: 'unauthorized',
        hint: 'Clé Corail (cc_…) ou clé privée Marevo (mk_…) attendue dans ?token=… ou en-tête x-api-key',
        expected_key_prefix: cfg?.webhook_secret ? cfg.webhook_secret.slice(0, 8) + '…' : null,
        received_cc_key_prefixes: candidates.filter((c) => c.startsWith('cc_')).map((c) => c.slice(0, 8) + '…'),
      }, 401);
    }

    if (cfg.marevo_tenant_id && body.tenant_id && body.tenant_id !== cfg.marevo_tenant_id) {
      console.error('marevo-webhook rejected: tenant mismatch');
      return json({ error: 'tenant_mismatch' }, 403);
    }

    const normalized = normalize(body);
    const bookingRef = nestedBookingId(body)
      ?? normalized.booking_ref
      ?? params.get('booking_id')
      ?? params.get('bookingId')
      ?? params.get('booking_reference')
      ?? params.get('reference');
    const rawEvent = body.event ?? body.type ?? (body.boats ? 'boat.sync' : (body.entity ?? 'booking.updated'));
    const event = rawEvent.toLowerCase();

    // ---- Status lookup (Marevo asks Corail for a check-in form status) ----
    const formIdCandidate = pick(body, [
      'checkin_form_id', 'checkinFormId', 'marevo_checkin_id', 'marevoCheckinId',
      'checkin_id', 'checkinId', 'form_id', 'formId',
    ]) ?? params.get('checkin_form_id') ?? params.get('marevo_checkin_id') ?? null;
    const isStatusLookup = event.includes('status') || event.includes('get')
      || (!!formIdCandidate && !normalized.planned_start_date && !body.boats);

    if (isStatusLookup && (formIdCandidate || bookingRef)) {
      let query = admin
        .from('administrative_checkin_forms')
        .select('id, status, marevo_booking_id, boat_id, planned_start_date, planned_end_date, updated_at')
        .limit(1);
      query = formIdCandidate && /^[0-9a-f-]{36}$/i.test(formIdCandidate)
        ? query.eq('id', formIdCandidate)
        : query.eq('marevo_booking_id', formIdCandidate ?? bookingRef ?? '');
      const { data: form } = await query.maybeSingle();

      if (!form) {
        return json({ success: false, error: 'checkin_form_not_found', checkin_form_id: formIdCandidate, booking_id: bookingRef }, 404);
      }

      // Complète le lien si Marevo fournit sa référence de réservation.
      if (bookingRef && !form.marevo_booking_id) {
        await admin
          .from('administrative_checkin_forms')
          .update({ marevo_booking_id: bookingRef })
          .eq('id', form.id);
      }

      const checkinDone = form.status === 'used' || form.status === 'completed';

      // ---- Inspections techniques (check-in / check-out) réalisées ----
      let { data: rentals } = await admin
        .from('boat_rentals')
        .select('id')
        .eq('marevo_checkin_form_id', form.id);
      if (!rentals?.length && form.boat_id) {
        // Legacy and out-of-date check-ins may not have the form link. Match the
        // rental itself rather than filtering checklists by their execution date:
        // an inspection can legitimately happen before/after the planned dates.
        const { data: matchingRentals } = await admin
          .from('boat_rentals')
          .select('id, marevo_checkin_form_id')
          .eq('boat_id', form.boat_id)
          .lte('start_date', form.planned_end_date)
          .gte('end_date', form.planned_start_date)
          .order('created_at', { ascending: false })
          .limit(1);
        rentals = matchingRentals ?? [];

        const matchedRental = rentals[0];
        if (matchedRental && !matchedRental.marevo_checkin_form_id) {
          await admin
            .from('boat_rentals')
            .update({ marevo_checkin_form_id: form.id })
            .eq('id', matchedRental.id);
        }
      }
      const rentalIds = (rentals ?? []).map((r: { id: string }) => r.id);

      let checklists: any[] = [];
      if (rentalIds.length) {
        const { data } = await admin
          .from('boat_checklists')
          .select('id, checklist_type, checklist_date, overall_status, general_notes, technician_name, customer_name, signature_url, customer_signature_url, created_at')
          .in('rental_id', rentalIds)
          .order('created_at', { ascending: true });
        checklists = data ?? [];
      }
      if (!checklists.length && form.boat_id) {
        // Last-resort lookup around the actual completion time. Do not use only
        // planned dates: early/late inspections are valid business cases.
        const completedAt = form.updated_at ?? form.planned_start_date;
        const windowStart = new Date(new Date(completedAt).getTime() - 48 * 60 * 60 * 1000).toISOString();
        const windowEnd = new Date(new Date(completedAt).getTime() + 48 * 60 * 60 * 1000).toISOString();
        const { data } = await admin
          .from('boat_checklists')
          .select('id, checklist_type, checklist_date, overall_status, general_notes, technician_name, customer_name, signature_url, customer_signature_url, created_at')
          .eq('boat_id', form.boat_id)
          .gte('created_at', windowStart)
          .lte('created_at', windowEnd)
          .order('created_at', { ascending: true });
        checklists = data ?? [];
      }

      const itemsByChecklist: Record<string, { total: number; ok: number; needs_repair: number; not_checked: number }> = {};
      if (checklists.length) {
        const { data: items } = await admin
          .from('boat_checklist_items')
          .select('checklist_id, status')
          .in('checklist_id', checklists.map((c) => c.id));
        for (const it of items ?? []) {
          const bucket = itemsByChecklist[it.checklist_id] ??= { total: 0, ok: 0, needs_repair: 0, not_checked: 0 };
          bucket.total += 1;
          if (it.status === 'ok') bucket.ok += 1;
          else if (it.status === 'needs_repair') bucket.needs_repair += 1;
          else bucket.not_checked += 1;
        }
      }

      const inspections = checklists.map((c) => ({
        id: c.id,
        type: c.checklist_type ?? 'checkin',
        date: c.checklist_date ?? c.created_at,
        completed_at: c.created_at,
        overall_status: c.overall_status,
        technician_name: c.technician_name,
        customer_name: c.customer_name,
        general_notes: c.general_notes,
        has_technician_signature: !!c.signature_url,
        has_customer_signature: !!c.customer_signature_url,
        items: itemsByChecklist[c.id] ?? { total: 0, ok: 0, needs_repair: 0, not_checked: 0 },
      }));

      const checkinInspection = inspections.find((i) => (i.type ?? '').includes('checkin')) ?? null;
      const checkoutInspection = inspections.find((i) => (i.type ?? '').includes('checkout')) ?? null;

      // Keep canonical fields plus common aliases used by Marevo Booking
      // function versions, so status refresh remains backward-compatible.
      const primaryInspection = checkinInspection ?? checkoutInspection;

      const response = {
        success: true,
        checkin_form_id: form.id,
        booking_id: form.marevo_booking_id ?? bookingRef,
        status: form.status,
        checkin_completed: checkinDone || !!checkinInspection,
        checkout_completed: form.status === 'completed' || !!checkoutInspection,
        boat_id: form.boat_id,
        planned_start_date: form.planned_start_date,
        planned_end_date: form.planned_end_date,
        updated_at: form.updated_at,
        has_inspection: inspections.length > 0,
        inspections_count: inspections.length,
        inspections,
        technical_inspections: inspections,
        inspection: primaryInspection,
        checklist: primaryInspection,
        checklist_id: primaryInspection?.id ?? null,
        inspection_id: primaryInspection?.id ?? null,
        inspection_date: primaryInspection?.date ?? null,
        completed_at: primaryInspection?.completed_at ?? form.updated_at,
        marevo_checkin_id: form.id,
        marevo_checkin_data: checkinInspection,
        marevo_checkout_data: checkoutInspection,
        checkin_inspection: checkinInspection,
        checkin: checkinInspection,
        checkin_data: checkinInspection,
        checkout_inspection: checkoutInspection,
        checkout: checkoutInspection,
        checkout_data: checkoutInspection,
      };

      // Some Marevo function builds read the payload at the root, others under
      // `data` or `details`. Return all three without changing canonical fields.
      return json({ ...response, data: response, details: response });

    }



    // ---- Boat updates from Marevo (single or batch) ----------------------
    if (event.startsWith('boat') || Array.isArray(body.boats)) {
      const items = Array.isArray(body.boats) && body.boats.length
        ? body.boats.map((b) => ({
            boat_external_id:
              b.marevo_boat_id ?? b.corail_boat_id ?? b.boat_external_id ?? b.boat_id ?? b.id ?? null,
            boat_name: b.name ?? b.boat_name ?? null,
            status: b.status ?? null,
          }))
        : [
            {
              boat_external_id: normalized.boat_external_id,
              boat_name: normalized.boat_name,
              status: (body.data?.status as string | undefined) ?? body.status ?? null,
            },
          ];

      const results: {
        boat_name: string | null;
        boat_id: string | null;
        received_id: string | null;
        applied: boolean;
      }[] = [];
      for (const item of items) {
        const boat = await resolveBoat(admin, {
          booking_ref: null,
          boat_external_id: item.boat_external_id,
          boat_name: item.boat_name,
        });
        const newStatus = event === 'boat.out_of_service' ? 'out_of_service' : item.status;
        let applied = false;
        if (boat && newStatus) {
          const { error } = await admin
            .from('boats')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', boat.id);
          applied = !error;
        } else if (boat) {
          // Nothing to change: the boat exists on both sides, the link is valid.
          applied = true;
        }
        results.push({
          boat_name: item.boat_name ?? boat?.name ?? null,
          boat_id: boat?.id ?? null,
          received_id: item.boat_external_id ?? null,
          applied,
        });
      }

      const matched = results.filter((r) => r.boat_id).length;
      const unmatched = results
        .filter((r) => !r.boat_id)
        .map((r) => ({ boat_name: r.boat_name, received_id: r.received_id }));
      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'inbound',
        endpoint: `webhook:${rawEvent}`,
        entity_type: 'boat',
        entity_id: results.length === 1 ? results[0].boat_id : null,
        request_payload: { ...body, tenant_id: undefined },
        response_payload: { results, unmatched } as unknown as Record<string, unknown>,
        http_status: 200,
        status: matched > 0 ? (unmatched.length ? 'success' : 'success') : 'skipped',
        error_message: unmatched.length
          ? `Bateaux non appariés (marevo_boat_id doit contenir l'UUID Corail) : ${unmatched
              .map((u) => u.boat_name ?? u.received_id ?? '?')
              .join(', ')}`
          : null,
      });
      return json({
        success: true,
        matched,
        total: results.length,
        unmatched,
        hint: unmatched.length
          ? "Renseignez marevo_boat_id avec l'identifiant Corail du bateau (Paramètres → Intégration → Correspondance de la flotte)."
          : undefined,
        results,
      });
    }


    // ---- Booking cancelled ----------------------------------------------
    const cancelled = event.includes('cancel') || (body.status ?? '').toLowerCase().includes('cancel');
    if (cancelled && bookingRef) {
      const formId = await cancelBooking(admin, bookingRef);
      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'inbound',
        endpoint: `webhook:${body.event}`,
        entity_type: 'booking',
        entity_id: formId,
        request_payload: { ...body, tenant_id: undefined },
        http_status: 200,
        status: formId ? 'success' : 'skipped',
        error_message: formId ? null : 'Aucune fiche liée à cette réservation',
        external_id: bookingRef,
      });
      return json({ success: true, cancelled: !!formId, checkin_form_id: formId });
    }

    // ---- Booking created / updated -> create the check-in form ----------
    const missing: string[] = [];
    if (!normalized.customer_first_name && !normalized.customer_name) missing.push('customer_first_name');
    if (!normalized.customer_last_name && !normalized.customer_name) missing.push('customer_last_name');
    if (!normalized.planned_start_date) missing.push('planned_start_date');
    if (!normalized.planned_end_date) missing.push('planned_end_date');
    if (missing.length) {
      return json({ error: 'missing_fields', missing }, 400);
    }

    const result = await applyBooking(admin, normalized);

    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'inbound',
      endpoint: `webhook:${body.event}`,
      entity_type: 'booking',
      entity_id: result.checkin_form_id,
      request_payload: { ...body, tenant_id: undefined },
      response_payload: result as unknown as Record<string, unknown>,
      http_status: 200,
      status: 'success',
      external_id: bookingRef,
    });

    return json({ success: true, ...result });
  } catch (e) {
    const message = (e as Error).message;
    console.error('marevo-webhook error', message);
    try {
      await logSync(admin, {
        direction: 'inbound',
        endpoint: `webhook:${body?.event ?? 'unknown'}`,
        entity_type: 'booking',
        request_payload: body ? { ...body, tenant_id: undefined } : null,
        http_status: 500,
        status: 'error',
        error_message: message,
      });
    } catch { /* ignore */ }
    return json({ success: false, error: 'unexpected_error' });
  }
}
