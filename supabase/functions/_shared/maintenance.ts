import { createClient } from 'npm:@supabase/supabase-js@2';

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Encryption helpers (AES-GCM, key derived from the edge secret)
// ---------------------------------------------------------------------------
const ENC_SECRET = Deno.env.get('MAINTENANCE_CREDENTIALS_ENCRYPTION_KEY');

async function cryptoKey(): Promise<CryptoKey> {
  if (!ENC_SECRET) throw new Error('MAINTENANCE_CREDENTIALS_ENCRYPTION_KEY is not configured');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ENC_SECRET));
  return await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await cryptoKey();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  return `v1:${b64(iv)}:${b64(ct)}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const [version, ivB64, ctB64] = payload.split(':');
  if (version !== 'v1' || !ivB64 || !ctB64) throw new Error('invalid_encrypted_payload');
  const key = await cryptoKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(ivB64) },
    key,
    unb64(ctB64),
  );
  return new TextDecoder().decode(plain);
}

// ---------------------------------------------------------------------------
// Integration credentials
// ---------------------------------------------------------------------------
export interface MaintenanceIntegration {
  id: string;
  maintenance_api_url: string;
  maintenance_api_key_encrypted: string | null;
  webhook_secret: string | null;
  marevo_tenant_id: string | null;
  is_active: boolean;
}

/** Returns the active integration with the API key decrypted, or null. Never log the key. */
export async function getIntegration(
  supabase: ReturnType<typeof adminClient>,
): Promise<{ integration: MaintenanceIntegration; apiKey: string } | null> {
  const { data, error } = await supabase
    .from('maintenance_integrations')
    .select('*')
    .eq('singleton', true)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.is_active || !data.maintenance_api_key_encrypted) return null;

  const apiKey = await decryptSecret(data.maintenance_api_key_encrypted);
  return { integration: data as MaintenanceIntegration, apiKey };
}

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// Sync log helpers
// ---------------------------------------------------------------------------
export const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 360];

export async function upsertSyncLog(
  supabase: ReturnType<typeof adminClient>,
  args: {
    log_id?: string | null;
    tenant_id?: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    status: 'pending' | 'success' | 'failed' | 'retrying';
    attempts?: number;
    last_error?: string | null;
    request_payload?: unknown;
    response_data?: unknown;
    external_id?: string | null;
  },
): Promise<string | null> {
  const row: Record<string, unknown> = {
    tenant_id: args.tenant_id ?? null,
    entity_type: args.entity_type,
    entity_id: args.entity_id,
    action: args.action,
    status: args.status,
    last_attempt_at: new Date().toISOString(),
    last_error: args.last_error ?? null,
    request_payload: args.request_payload ?? null,
    response_data: args.response_data ?? null,
    external_id: args.external_id ?? null,
  };
  if (typeof args.attempts === 'number') row.attempts = args.attempts;

  if (args.log_id) {
    const { error } = await supabase.from('maintenance_sync_log').update(row).eq('id', args.log_id);
    if (error) console.error('sync log update failed', error.message);
    return args.log_id;
  }

  const { data, error } = await supabase
    .from('maintenance_sync_log')
    .insert(row)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('sync log insert failed', error.message);
    return null;
  }
  return data?.id ?? null;
}

/** Existing successful create sync for this entity (idempotence guard). */
export async function findSuccessfulCreate(
  supabase: ReturnType<typeof adminClient>,
  entityType: string,
  entityId: string,
) {
  const { data } = await supabase
    .from('maintenance_sync_log')
    .select('id, external_id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('action', 'create')
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function postToMaintenance(
  url: string,
  apiKey: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: unknown; retryable: boolean }> {
  let status = 0;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(body),
    });
    status = res.status;
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }
    return { ok: res.ok, status, data, retryable: status >= 500 || status === 429 };
  } catch (e) {
    console.error('maintenance request failed (network)', (e as Error).message);
    return { ok: false, status, data: { error: (e as Error).message }, retryable: true };
  }
}
