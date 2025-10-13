import type {
  PostgrestError,
  PostgrestMaybeSingleResponse,
  PostgrestResponse,
  PostgrestSingleResponse,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SCHEMA_CACHE_ERROR_CODE = 'PGRST204';

export type PostgrestResult<T> =
  | PostgrestResponse<T>
  | PostgrestSingleResponse<T>
  | PostgrestMaybeSingleResponse<T>;

function isSchemaCacheError(error: PostgrestError | null): boolean {
  if (!error) {
    return false;
  }

  if (error.code === SCHEMA_CACHE_ERROR_CODE) {
    return true;
  }

  return error.message?.toLowerCase().includes('schema cache') ?? false;
}

async function requestSchemaReload(client: SupabaseClient<Database>) {
  try {
    await client.rpc('reload_postgrest_schema');
  } catch (reloadError) {
    console.warn('Failed to reload PostgREST schema', reloadError);
  }
}

export async function executeWithSchemaReload<T>(
  client: SupabaseClient<Database>,
  operation: () => Promise<PostgrestResult<T>>
): Promise<PostgrestResult<T>> {
  let result = await operation();

  if (result.error && isSchemaCacheError(result.error)) {
    await requestSchemaReload(client);
    result = await operation();
  }

  return result;
}
