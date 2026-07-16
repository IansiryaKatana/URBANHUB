import type { PostgrestError } from "@supabase/supabase-js";

const SUPABASE_PAGE_SIZE = 1000;

type SupabaseBatchResult<T> = {
  data: T[] | null;
  error: PostgrestError | null;
};

/**
 * Fetches all rows from a Supabase query, paging past the default 1000-row cap.
 * Apply filters on the builder before `.order()` / `.range()`.
 */
export async function fetchAllSupabaseRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<SupabaseBatchResult<T>>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await Promise.resolve(buildQuery(from, from + SUPABASE_PAGE_SIZE - 1));
    if (error) throw error;

    const batch = data ?? [];
    all.push(...batch);

    if (batch.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}
