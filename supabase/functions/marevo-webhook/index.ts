import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { adminClient, getConfig, logSync } from '../_shared/marevo.ts';

const BodySchema = z.object({
  event: z.string().min(1).max(100),
  tenant_id: z.string().max(100).optional().nullable(),
  checkin_form_id: z.string().max(100).optional().nullable(),
  booking_external_id: z.string().uuid().optional().nullable(),
  boat_external_id: z.string().uuid().optional().nullable(),
  customer_email: z.string().max(255).optional().nullable(),
  planned_start_date: z.string().max(30).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  data: z.record(z.unknown()).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function rentalStatusFor(event: string, status?: string | null): string | null {
  const key = `${event} ${status ?? ''}`.toLowerCase();
  if (key.includes('cancel')) return 'cancelled';
  if (key.includes('checkout') || key.includes('completed') || key.includes('finish')) return 'completed';
  if (key.includes('checkin') && (key.includes('used') || key.includes('start') || key.includes('active'))) return 'active';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = adminClient();
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;

    const cfg = await getConfig(admin);
    const provided = req.headers.get('x-webhook-secret') ?? '';
    if (!cfg || !cfg.webhook_secret || provided !== cfg.webhook_secret) {
      console.error('marevo-webhook rejected: invalid secret');
      return json({ error: 'unauthorized' }, 401);
    }
    if (cfg.marevo_tenant_id && body.tenant_id && body.tenant_id !== cfg.marevo_tenant_id) {
      console.error('marevo-webhook rejected: tenant mismatch');
      return json({ error: 'tenant_mismatch' }, 403);
    }

    let applied = false;
    let entityType = 'checkin';
    let entityId: string | null = null;

    if (body.event.startsWith('boat.')) {
      entityType = 'boat';
      entityId = body.boat_external_id ?? null;
      if (entityId) {
        const newStatus =
          body.event === 'boat.out_of_service'
            ? 'out_of_service'
            : ((body.data?.status as string | undefined) ?? null);
        if (newStatus) {
          const { error } = await admin
            .from('boats')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', entityId);
          if (!error) applied = true;
          else console.error('marevo-webhook boat update failed', error.message);
        }
      }
    } else {
      entityType = 'booking';
      let query = admin.from('boat_rentals').select('id').limit(1);
      if (body.booking_external_id) query = query.eq('id', body.booking_external_id);
      else if (body.checkin_form_id) query = query.eq('marevo_checkin_form_id', body.checkin_form_id);
      else if (body.customer_email && body.planned_start_date)
        query = query.eq('customer_email', body.customer_email).eq('start_date', body.planned_start_date);
      else query = query.eq('id', '00000000-0000-0000-0000-000000000000');

      const { data: rental } = await query.maybeSingle();
      entityId = rental?.id ?? null;

      const newStatus = rentalStatusFor(body.event, body.status);
      if (entityId && newStatus) {
        const { error } = await admin
          .from('boat_rentals')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', entityId);
        if (!error) applied = true;
        else console.error('marevo-webhook rental update failed', error.message);
      }
    }

    await logSync(admin, {
      tenant_id: cfg.marevo_tenant_id,
      direction: 'inbound',
      endpoint: `webhook:${body.event}`,
      entity_type: entityType,
      entity_id: entityId,
      request_payload: { ...body, tenant_id: undefined },
      http_status: 200,
      status: applied ? 'success' : 'skipped',
      error_message: applied ? null : 'Entité introuvable ou statut non applicable',
      external_id: body.checkin_form_id ?? null,
    });

    // Always 200 so Marevo never retries indefinitely
    return json({ success: true, applied, matched: entityId });
  } catch (e) {
    console.error('marevo-webhook error', (e as Error).message);
    return json({ success: true, applied: false, error: 'unexpected_error' });
  }
});
