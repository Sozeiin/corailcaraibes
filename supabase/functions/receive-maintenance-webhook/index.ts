import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { adminClient, upsertSyncLog } from '../_shared/maintenance.ts';

const BodySchema = z.object({
  tenant_id: z.string().max(100).optional().nullable(),
  event: z.string().min(1).max(100),
  checkin_form_id: z.string().max(100).optional().nullable(),
  rental_external_id: z.string().uuid().optional().nullable(),
  boat_external_id: z.string().uuid().optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  data: z.record(z.unknown()).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Marevo check-in status -> Corail Caraïbes boat_rentals.status (only these fields are touched) */
function mapRentalStatus(event: string, status?: string | null): string | null {
  const key = (status ?? event).toLowerCase();
  if (key.includes('start')) return 'active';
  if (key.includes('complete') || key.includes('finish') || key.includes('checkout')) return 'completed';
  if (key.includes('cancel')) return 'cancelled';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = adminClient();
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const body = parsed.data;

    const { data: integration } = await admin
      .from('maintenance_integrations')
      .select('id, webhook_secret, inbound_api_key, is_active, marevo_tenant_id')
      .eq('singleton', true)
      .maybeSingle();

    const providedSecret = req.headers.get('x-webhook-secret') ?? '';
    const providedKey = req.headers.get('x-api-key') ?? '';
    if (!integration || !integration.is_active) {
      return json({ error: 'no_integration' }, 403);
    }
    const secretOk = !!integration.webhook_secret && providedSecret === integration.webhook_secret;
    const keyOk = !!integration.inbound_api_key && providedKey === integration.inbound_api_key;
    if (!secretOk && !keyOk) {
      console.error('webhook rejected: bad secret');
      return json({ error: 'invalid_secret' }, 401);
    }
    if (
      integration.marevo_tenant_id &&
      body.tenant_id &&
      body.tenant_id !== integration.marevo_tenant_id
    ) {
      console.error('webhook rejected: tenant mismatch');
      return json({ error: 'tenant_mismatch' }, 403);
    }

    // Resolve the local rental: by explicit external id, else by stored checkin_form_id
    let rentalId = body.rental_external_id ?? null;
    if (!rentalId && body.checkin_form_id) {
      const { data: logRow } = await admin
        .from('maintenance_sync_log')
        .select('entity_id')
        .eq('entity_type', 'rental')
        .eq('external_id', body.checkin_form_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      rentalId = logRow?.entity_id ?? null;
    }

    let updated = false;
    if (rentalId) {
      const newStatus = mapRentalStatus(body.event, body.status);
      if (newStatus) {
        // Only the status field is touched — every other Corail Caraïbes field is preserved
        const { error } = await admin
          .from('boat_rentals')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', rentalId);
        if (error) {
          console.error('webhook rental update failed', error.message);
        } else {
          updated = true;
        }
      }

      await upsertSyncLog(admin, {
        entity_type: 'rental',
        entity_id: rentalId,
        action: 'update',
        status: 'success',
        external_id: body.checkin_form_id ?? null,
        response_data: { inbound: true, event: body.event, status: body.status, applied: updated },
      });
    } else if (body.boat_external_id) {
      await upsertSyncLog(admin, {
        entity_type: 'boat',
        entity_id: body.boat_external_id,
        action: 'update',
        status: 'success',
        response_data: { inbound: true, event: body.event, data: body.data ?? null },
      });
    }

    console.log('webhook processed', body.event, 'rental', rentalId, 'applied', updated);
    return json({ success: true, matched_rental: rentalId, applied: updated });
  } catch (e) {
    console.error('receive-maintenance-webhook error', (e as Error).message);
    return json({ error: 'unexpected_error' }, 500);
  }
});
