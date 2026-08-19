import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { adminClient, RETRY_BACKOFF_MINUTES, SUPABASE_URL } from '../_shared/maintenance.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const FUNCTION_BY_ENTITY: Record<string, string> = {
  rental: 'sync-rental-to-maintenance',
  boat: 'sync-boat-to-maintenance',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = adminClient();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { data: rows, error } = await admin
      .from('maintenance_sync_log')
      .select('id, entity_type, entity_id, action, attempts, last_attempt_at, status, last_error')
      .in('status', ['pending', 'retrying'])
      .lt('attempts', 5)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;

    let triggered = 0;
    let skipped = 0;

    for (const row of rows ?? []) {
      if (row.last_error === 'no_integration') {
        skipped++;
        continue;
      }
      const waitMinutes = RETRY_BACKOFF_MINUTES[Math.min(row.attempts, RETRY_BACKOFF_MINUTES.length - 1)];
      if (row.last_attempt_at) {
        const due = new Date(row.last_attempt_at).getTime() + waitMinutes * 60_000;
        if (Date.now() < due) {
          skipped++;
          continue;
        }
      }

      const fn = FUNCTION_BY_ENTITY[row.entity_type];
      if (!fn) {
        skipped++;
        continue;
      }

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ entity_id: row.entity_id, log_id: row.id, action: row.action }),
        });
        await res.text();
        triggered++;
      } catch (e) {
        console.error('retry invocation failed for log', row.id, (e as Error).message);
      }
    }

    console.log(`retry worker: ${triggered} relancés, ${skipped} ignorés`);
    return json({ success: true, triggered, skipped, candidates: rows?.length ?? 0 });
  } catch (e) {
    console.error('retry-failed-maintenance-syncs error', (e as Error).message);
    return json({ success: false, error: 'unexpected_error' }, 500);
  }
});
