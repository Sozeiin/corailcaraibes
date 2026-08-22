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

export async function handleMarevoWebhook(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = adminClient();
  let body: Body | null = null;

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    body = parsed.data;

    const cfg = await getConfig(admin);
    const params = new URL(req.url).searchParams;
    const candidates = [
      req.headers.get('x-webhook-secret'),
      req.headers.get('x-api-key'),
      req.headers.get('api_key'),
      req.headers.get('x-corail-key'),
      req.headers.get('x-corail-api-key'),
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null,
      params.get('token'),
      params.get('key'),
      params.get('secret'),
    ].filter((v): v is string => !!v && v.length > 0);
    if (!cfg || !cfg.webhook_secret || !candidates.includes(cfg.webhook_secret)) {
      console.error('marevo-webhook rejected: invalid secret');
      return json({ error: 'unauthorized', hint: 'Clé Corail Caraïbes attendue dans ?token=… ou en-tête x-api-key' }, 401);
    }
    if (cfg.marevo_tenant_id && body.tenant_id && body.tenant_id !== cfg.marevo_tenant_id) {
      console.error('marevo-webhook rejected: tenant mismatch');
      return json({ error: 'tenant_mismatch' }, 403);
    }

    const normalized = normalize(body);
    const bookingRef = normalized.booking_ref;
    const rawEvent = body.event ?? body.type ?? (body.boats ? 'boat.sync' : (body.entity ?? 'booking.updated'));
    const event = rawEvent.toLowerCase();

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
