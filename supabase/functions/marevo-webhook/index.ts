import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { adminClient, getConfig, logSync } from '../_shared/marevo.ts';
import { applyBooking, cancelBooking, resolveBoat, type NormalizedBooking } from '../_shared/marevoBooking.ts';

/**
 * INBOUND endpoint: Marevo Booking -> Corail Caraïbes.
 * Marevo pushes bookings (client + dates + bateau). Corail creates/updates
 * the customer file and the administrative check-in form so a technician can
 * run the check-in, then Corail pushes the completed check-in / check-out back.
 */
const BodySchema = z.object({
  event: z.string().min(1).max(100),
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
});

type Body = z.infer<typeof BodySchema>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalize(body: Body): NormalizedBooking {
  return {
    booking_ref: body.booking_id ?? body.external_id ?? body.booking_reference ?? null,
    customer_first_name: body.customer_first_name ?? body.end_client_first_name ?? null,
    customer_last_name: body.customer_last_name ?? body.end_client_last_name ?? null,
    customer_name: body.customer_name ?? null,
    customer_email: body.customer_email ?? body.end_client_email ?? null,
    customer_phone: body.customer_phone ?? body.end_client_phone ?? null,
    customer_address: body.customer_address ?? null,
    customer_city: body.customer_city ?? null,
    customer_postal_code: body.customer_postal_code ?? null,
    customer_country: body.customer_country ?? null,
    boat_external_id: body.boat_external_id ?? null,
    boat_name: body.boat_name ?? (body.data?.boat_name as string | undefined) ?? null,
    base_name: body.base_name ?? null,
    planned_start_date: body.planned_start_date ?? body.start_date ?? null,
    planned_end_date: body.planned_end_date ?? body.end_date ?? null,
    rental_notes: body.rental_notes ?? body.internal_notes ?? null,
    special_instructions: body.special_instructions ?? body.special_requests ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = adminClient();
  let body: Body | null = null;

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    body = parsed.data;

    const cfg = await getConfig(admin);
    const urlToken = new URL(req.url).searchParams.get('token') ?? '';
    const provided =
      req.headers.get('x-webhook-secret') ??
      req.headers.get('x-api-key') ??
      req.headers.get('api_key') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
      urlToken;
    if (!cfg || !cfg.webhook_secret || provided !== cfg.webhook_secret) {
      console.error('marevo-webhook rejected: invalid secret');
      return json({ error: 'unauthorized' }, 401);
    }
    if (cfg.marevo_tenant_id && body.tenant_id && body.tenant_id !== cfg.marevo_tenant_id) {
      console.error('marevo-webhook rejected: tenant mismatch');
      return json({ error: 'tenant_mismatch' }, 403);
    }

    const normalized = normalize(body);
    const bookingRef = normalized.booking_ref;
    const event = body.event.toLowerCase();

    // ---- Boat updates from Marevo ---------------------------------------
    if (event.startsWith('boat.')) {
      const boat = await resolveBoat(admin, normalized);
      const newStatus =
        event === 'boat.out_of_service'
          ? 'out_of_service'
          : ((body.data?.status as string | undefined) ?? body.status ?? null);
      let applied = false;
      if (boat && newStatus) {
        const { error } = await admin
          .from('boats')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', boat.id);
        applied = !error;
      }
      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'inbound',
        endpoint: `webhook:${body.event}`,
        entity_type: 'boat',
        entity_id: boat?.id ?? null,
        request_payload: { ...body, tenant_id: undefined },
        http_status: 200,
        status: applied ? 'success' : 'skipped',
        error_message: applied ? null : 'Bateau introuvable ou statut non applicable',
      });
      return json({ success: true, applied, boat_id: boat?.id ?? null });
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
});
