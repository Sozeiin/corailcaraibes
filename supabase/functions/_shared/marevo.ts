import { createClient } from 'npm:@supabase/supabase-js@2';

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Admin = ReturnType<typeof adminClient>;

export interface MarevoConfig {
  id: string;
  marevo_base_url: string;
  marevo_api_key: string | null;
  marevo_tenant_id: string | null;
  webhook_secret: string | null;
  sync_enabled: boolean;
  sync_boats_enabled: boolean;
  sync_bookings_enabled: boolean;
  last_sync_at: string | null;
}

export async function getConfig(admin: Admin): Promise<MarevoConfig | null> {
  const { data, error } = await admin
    .from('marevo_integration_config')
    .select(
      'id, marevo_base_url, marevo_api_key, marevo_tenant_id, webhook_secret, sync_enabled, sync_boats_enabled, sync_bookings_enabled, last_sync_at',
    )
    .eq('singleton', true)
    .maybeSingle();
  if (error) throw error;
  return (data as MarevoConfig) ?? null;
}

/**
 * Marevo can be reached either through the canonical Supabase function endpoints
 * (base URL without query string) or through a single webhook URL that already
 * carries its tenant/token in the query string. Both shapes are supported.
 */
export function isWebhookStyle(baseUrl: string): boolean {
  return baseUrl.includes('?');
}

export function endpointUrl(baseUrl: string, path: string, query?: Record<string, string>): string {
  if (isWebhookStyle(baseUrl)) return baseUrl;
  const url = new URL(baseUrl.replace(/\/+$/, '') + path);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return url.toString();
}

const BACKOFF_MS = [1000, 4000, 10000];
const TIMEOUT_MS = 20000;

export interface CallResult {
  ok: boolean;
  status: number;
  data: unknown;
  attempt: number;
  error?: string;
}

async function once(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; data: unknown; error?: string; retryable: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }
    return {
      ok: res.ok,
      status: res.status,
      data,
      retryable: res.status >= 500 || res.status === 429,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'timeout' : (e as Error).message;
    return { ok: false, status: 0, data: null, retryable: true, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** Sends a request with 3 attempts / backoff on 5xx and network errors. Never logs the API key. */
export async function callMarevo(
  cfg: MarevoConfig,
  url: string,
  method: 'GET' | 'POST',
  body?: unknown,
  onAttempt?: (r: CallResult) => Promise<void>,
): Promise<CallResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.marevo_api_key) headers['x-api-key'] = cfg.marevo_api_key;

  for (let i = 0; i < BACKOFF_MS.length; i++) {
    const res = await once(url, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    });
    const result: CallResult = {
      ok: res.ok,
      status: res.status,
      data: res.data,
      attempt: i + 1,
      error: res.error,
    };
    if (onAttempt) await onAttempt(result);
    if (res.ok || !res.retryable) return result;
    if (i < BACKOFF_MS.length - 1) await new Promise((r) => setTimeout(r, BACKOFF_MS[i]));
    else return result;
  }
  return { ok: false, status: 0, data: null, attempt: BACKOFF_MS.length, error: 'unknown' };
}

export async function logSync(
  admin: Admin,
  row: {
    tenant_id?: string | null;
    direction: 'outbound' | 'inbound';
    endpoint?: string | null;
    entity_type: string;
    entity_id?: string | null;
    request_payload?: unknown;
    response_payload?: unknown;
    http_status?: number | null;
    status: 'success' | 'error' | 'skipped';
    error_message?: string | null;
    attempt?: number;
    external_id?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from('marevo_sync_log').insert({
    tenant_id: row.tenant_id ?? null,
    direction: row.direction,
    endpoint: row.endpoint ?? null,
    entity_type: row.entity_type,
    entity_id: row.entity_id ?? null,
    request_payload: row.request_payload ?? null,
    response_payload: row.response_payload ?? null,
    http_status: row.http_status ?? null,
    status: row.status,
    error_message: row.error_message ?? null,
    attempt: row.attempt ?? 1,
    external_id: row.external_id ?? null,
  });
  if (error) console.error('marevo_sync_log insert failed', error.message);
}

export function splitName(full: string): { first: string; last: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Client', last: '-' };
  if (parts.length === 1) return { first: parts[0], last: '-' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}
