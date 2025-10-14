import type {
  PostgrestError,
  PostgrestMaybeSingleResponse,
  PostgrestResponse,
  PostgrestSingleResponse
} from '@supabase/supabase-js';

const BRAND_COLUMN_ERROR_CODE = 'PGRST204';
const BRAND_COLUMN_MESSAGE_FRAGMENT = "'brand' column of 'stock_items'";

type PostgrestResult<T> =
  | PostgrestResponse<T>
  | PostgrestSingleResponse<T>
  | PostgrestMaybeSingleResponse<T>;

export function isBrandColumnMissingError(error: PostgrestError | null): boolean {
  return (
    !!error &&
    error.code === BRAND_COLUMN_ERROR_CODE &&
    (error.message?.includes(BRAND_COLUMN_MESSAGE_FRAGMENT) ?? false)
  );
}

export async function withBrandColumnFallback<T>(
  operation: () => Promise<PostgrestResult<T>>,
  fallbackOperation: () => Promise<PostgrestResult<T>>
): Promise<{ result: PostgrestResult<T>; usedFallback: boolean }> {
  const result = await operation();

  if (isBrandColumnMissingError(result.error)) {
    console.warn(
      "Supabase schema cache is missing the 'brand' column for stock_items. Retrying without the column."
    );

    const fallbackResult = await fallbackOperation();
    return { result: fallbackResult, usedFallback: true };
  }

  return { result, usedFallback: false };
}
