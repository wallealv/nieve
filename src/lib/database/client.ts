// SERVER-ONLY. Imported by api/*.ts (and the server-side libs they use), never by browser code:
// it holds the Supabase secret key (service_role), which bypasses RLS. That is also why the env
// vars are NOT `VITE_`-prefixed — Vite only exposes `VITE_*` variables to the bundle.
//
// The tables live in schema `nieve` of the shared wallealv Supabase project; its migrations are in
// the wallealv/wallealv-id repo, never here. Without SUPABASE_URL + SUPABASE_SECRET_KEY (local dev,
// CI, previews) `getDatabaseClient()` returns null and every database feature is silently off.
import { createClient } from '@supabase/supabase-js';

export const DATABASE_SCHEMA = 'nieve';
export const DATABASE_TIMEOUT_MS = 2000;

export interface DatabaseError {
  message: string;
}

/** The slice of the Supabase client this app uses; lets tests pass small fakes. */
export interface NieveDatabase {
  from(table: string): {
    upsert(
      rows: object[],
      options: { onConflict: string },
    ): PromiseLike<{ error: DatabaseError | null }>;
  };
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: DatabaseError | null }>;
}

export interface DatabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
}

let cached: { url: string; key: string; client: NieveDatabase } | null = null;

export function warnDatabase(action: string, error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
  console.warn(`[nieve-db] ${action} failed: ${message}`);
}

/** Lazy singleton; null when the env vars are missing (the app then behaves as without a DB). */
export function getDatabaseClient(
  env: DatabaseEnv = process.env,
): NieveDatabase | null {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  if (cached && cached.url === url && cached.key === key) return cached.client;

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: DATABASE_SCHEMA },
    });
    cached = { url, key, client };
    return client;
  } catch (error) {
    warnDatabase('create client', error);
    return null;
  }
}

/** Rejects if `operation` does not settle within `timeoutMs`. */
export function withTimeout<T>(
  operation: PromiseLike<T>,
  action: string,
  timeoutMs = DATABASE_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${action} timed out after ${timeoutMs} ms`)),
      timeoutMs,
    );
  });
  return Promise.race([Promise.resolve(operation), timeout]).finally(() =>
    clearTimeout(timer),
  );
}

/** Upserts `rows` into a `nieve` table. Never throws: logs and returns false on any failure. */
export async function upsertRows(
  client: NieveDatabase,
  table: string,
  rows: object[],
  onConflict: string,
  timeoutMs = DATABASE_TIMEOUT_MS,
): Promise<boolean> {
  if (rows.length === 0) return true;
  try {
    const { error } = await withTimeout(
      client.from(table).upsert(rows, { onConflict }),
      `upsert ${table}`,
      timeoutMs,
    );
    if (error) {
      warnDatabase(`upsert ${table}`, error);
      return false;
    }
    return true;
  } catch (error) {
    warnDatabase(`upsert ${table}`, error);
    return false;
  }
}

/** Runs a best-effort step (DB read/write) and returns `fallback` instead of throwing. */
export async function runSafely<T>(
  action: string,
  task: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    warnDatabase(action, error);
    return fallback;
  }
}
