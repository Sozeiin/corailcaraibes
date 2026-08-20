import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { adminClient, getConfig, logSync, splitName, type Admin } from '../_shared/marevo.ts';

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

function isUuid(v?: string | null): boolean {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function toIso(v?: string | null): string | null {
  if (!v) return null;
  const d = new Date(v.length === 10 ? `${v}T12:00:00Z` : v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function resolveBoat(admin: Admin, body: Body) {
  if (isUuid(body.boat_external_id)) {
    const { data } = await admin
      .from('boats')
      .select('id, name, status, base_id')
      .eq('id', body.boat_external_id!)
      .maybeSingle();
    if (data) return data;
  }
  const name = body.boat_name ?? (body.data?.boat_name as string | undefined);
  if (name) {
    const { data } = await admin
      .from('boats')
      .select('id, name, status, base_id')
      .ilike('name', name)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function resolveBaseId(admin: Admin, body: Body, boatBaseId?: string | null) {
  if (boatBaseId) return boatBaseId;
  if (body.base_name) {
    const { data } = await admin.from('bases').select('id').ilike('name', `%${body.base_name}%`).limit(1).maybeSingle();
    if (data) return data.id as string;
  }
  const { data } = await admin.from('bases').select('id').order('name').limit(1).maybeSingle();
  return (data?.id as string) ?? null;
}

async function upsertCustomer(admin: Admin, body: Body, baseId: string) {
  let first = body.customer_first_name ?? null;
  let last = body.customer_last_name ?? null;
  if (!first || !last) {
    const split = splitName(body.customer_name ?? `${first ?? ''} ${last ?? ''}`);
    first = first || split.first;
    last = last || split.last;
  }

  if (body.customer_email) {
    const { data: existing } = await admin
      .from('customers')
      .select('id')
      .eq('email', body.customer_email)
      .limit(1)
      .maybeSingle();
    if (existing) {
      await admin
        .from('customers')
        .update({
          first_name: first,
          last_name: last,
          phone: body.customer_phone ?? undefined,
          address: body.customer_address ?? undefined,
          city: body.customer_city ?? undefined,
          postal_code: body.customer_postal_code ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return existing.id as string;
    }
  }

  const { data: created, error } = await admin
    .from('customers')
    .insert({
      base_id: baseId,
      first_name: first,
      last_name: last,
      email: body.customer_email ?? null,
      phone: body.customer_phone ?? null,
      address: body.customer_address ?? null,
      city: body.customer_city ?? null,
      postal_code: body.customer_postal_code ?? null,
      country: body.customer_country ?? undefined,
      notes: 'Client importé depuis Marevo Booking',
      created_by_name: 'Marevo Booking',
    })
    .select('id')
    .single();
  if (error) throw error;
  return created.id as string;
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
    const provided = req.headers.get('x-webhook-secret') ?? req.headers.get('x-api-key') ?? '';
    if (!cfg || !cfg.webhook_secret || provided !== cfg.webhook_secret) {
      console.error('marevo-webhook rejected: invalid secret');
      return json({ error: 'unauthorized' }, 401);
    }
    if (cfg.marevo_tenant_id && body.tenant_id && body.tenant_id !== cfg.marevo_tenant_id) {
      console.error('marevo-webhook rejected: tenant mismatch');
      return json({ error: 'tenant_mismatch' }, 403);
    }

    const bookingRef = body.booking_id ?? body.external_id ?? body.booking_reference ?? null;
    const event = body.event.toLowerCase();

    // ---- Boat updates from Marevo ---------------------------------------
    if (event.startsWith('boat.')) {
      const boat = await resolveBoat(admin, body);
      const newStatus =
        event === 'boat.out_of_service' ? 'out_of_service' : ((body.data?.status as string | undefined) ?? body.status ?? null);
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
      const { data: form } = await admin
        .from('administrative_checkin_forms')
        .select('id, status')
        .eq('marevo_booking_id', bookingRef)
        .maybeSingle();
      if (form && form.status !== 'used' && form.status !== 'completed') {
        await admin
          .from('administrative_checkin_forms')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', form.id);
      }
      await logSync(admin, {
        tenant_id: cfg.marevo_tenant_id,
        direction: 'inbound',
        endpoint: `webhook:${body.event}`,
        entity_type: 'booking',
        entity_id: form?.id ?? null,
        request_payload: { ...body, tenant_id: undefined },
        http_status: 200,
        status: form ? 'success' : 'skipped',
        error_message: form ? null : 'Aucune fiche liée à cette réservation',
        external_id: bookingRef,
      });
      return json({ success: true, cancelled: !!form, checkin_form_id: form?.id ?? null });
    }

    // ---- Booking created / updated -> create the check-in form ----------
    const start = toIso(body.planned_start_date ?? body.start_date);
    const end = toIso(body.planned_end_date ?? body.end_date);

    const boat = await resolveBoat(admin, body);
    const baseId = await resolveBaseId(admin, body, boat?.base_id ?? null);
    if (!baseId) return json({ success: false, error: 'no_base_available' });

    const customerId = await upsertCustomer(admin, body, baseId);
    const canAssign = !!boat && boat.status === 'available';

    const formPayload: Record<string, unknown> = {
      base_id: baseId,
      customer_id: customerId,
      boat_id: canAssign ? boat!.id : null,
      suggested_boat_id: boat?.id ?? null,
      is_boat_assigned: canAssign,
      planned_start_date: start,
      planned_end_date: end,
      rental_notes: body.rental_notes ?? null,
      special_instructions: body.special_instructions ?? null,
      status: canAssign ? 'ready' : 'draft',
      marevo_booking_id: bookingRef,
      marevo_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let formId: string | null = null;
    let existing: { id: string; status: string | null } | null = null;
    if (bookingRef) {
      const { data } = await admin
        .from('administrative_checkin_forms')
        .select('id, status')
        .eq('marevo_booking_id', bookingRef)
        .maybeSingle();
      existing = data as typeof existing;
    }

    if (existing) {
      formId = existing.id;
      // Never overwrite a form already used by a technician (boat assignment is immutable)
      if (existing.status === 'used' || existing.status === 'completed') {
        delete formPayload.boat_id;
        delete formPayload.suggested_boat_id;
        delete formPayload.is_boat_assigned;
        delete formPayload.status;
      }
      const { error } = await admin.from('administrative_checkin_forms').update(formPayload).eq('id', formId);
      if (error) throw error;
    } else {
      const { data, error } = await admin
        .from('administrative_checkin_forms')
        .insert(formPayload)
        .select('id')
        .single();
      if (error) throw error;
      formId = data.id as string;
    }

    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'inbound',
      endpoint: `webhook:${body.event}`,
      entity_type: 'booking',
      entity_id: formId,
      request_payload: { ...body, tenant_id: undefined },
      response_payload: { checkin_form_id: formId, customer_id: customerId, boat_id: boat?.id ?? null, assigned: canAssign },
      http_status: 200,
      status: 'success',
      external_id: bookingRef,
    });

    return json({
      success: true,
      checkin_form_id: formId,
      customer_id: customerId,
      boat_id: boat?.id ?? null,
      boat_assigned: canAssign,
      created: !existing,
    });
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
