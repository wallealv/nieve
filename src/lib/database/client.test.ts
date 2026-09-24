import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  getDatabaseClient,
  runSafely,
  upsertRows,
  withTimeout,
  type NieveDatabase,
} from './client.js';
import { addCalendarDays, resortLocalDate } from './dates.js';

function fakeClient(result: () => PromiseLike<{ error: { message: string } | null }>) {
  const upsert = vi.fn(result);
  const from = vi.fn(() => ({ upsert }));
  const client: NieveDatabase = {
    from,
    rpc: vi.fn(async () => ({ data: [], error: null })),
  };
  return { client, from, upsert };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('getDatabaseClient', () => {
  test('is disabled when either env var is missing or blank', () => {
    expect(getDatabaseClient({})).toBeNull();
    expect(getDatabaseClient({ SUPABASE_URL: 'https://example.supabase.co' })).toBeNull();
    expect(getDatabaseClient({ SUPABASE_SECRET_KEY: 'sb_secret_test' })).toBeNull();
    expect(
      getDatabaseClient({ SUPABASE_URL: ' ', SUPABASE_SECRET_KEY: 'sb_secret_test' }),
    ).toBeNull();
  });

  test('reuses one client for the same credentials', () => {
    const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' };
    const client = getDatabaseClient(env);
    expect(client).not.toBeNull();
    expect(getDatabaseClient(env)).toBe(client);
  });

  test('returns null instead of throwing on an invalid URL', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      getDatabaseClient({ SUPABASE_URL: 'not a url', SUPABASE_SECRET_KEY: 'sb_secret_test' }),
    ).toBeNull();
  });
});

describe('withTimeout', () => {
  test('rejects when the operation does not settle in time', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 'slow call', 2000);
    const assertion = expect(pending).rejects.toThrow(/slow call timed out after 2000 ms/);
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
  });

  test('resolves with the operation result', async () => {
    await expect(withTimeout(Promise.resolve(7), 'fast call')).resolves.toBe(7);
  });
});

describe('upsertRows', () => {
  test('upserts on the given conflict target', async () => {
    const { client, from, upsert } = fakeClient(async () => ({ error: null }));
    await expect(upsertRows(client, 'snow_observations', [{ a: 1 }], 'a')).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('snow_observations');
    expect(upsert).toHaveBeenCalledWith([{ a: 1 }], { onConflict: 'a' });
  });

  test('skips the request when there is nothing to save', async () => {
    const { client, from } = fakeClient(async () => ({ error: null }));
    await expect(upsertRows(client, 'snow_observations', [], 'a')).resolves.toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  test('returns false and logs on database errors, exceptions and timeouts', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = fakeClient(async () => ({ error: { message: 'permission denied' } }));
    const throwing = fakeClient(async () => {
      throw new Error('fetch failed');
    });
    const hanging = fakeClient(() => new Promise(() => {}));

    await expect(upsertRows(failing.client, 't', [{}], 'a')).resolves.toBe(false);
    await expect(upsertRows(throwing.client, 't', [{}], 'a')).resolves.toBe(false);
    await expect(upsertRows(hanging.client, 't', [{}], 'a', 5)).resolves.toBe(false);
    expect(warn.mock.calls.map((call) => String(call[0]))).toEqual([
      '[nieve-db] upsert t failed: permission denied',
      '[nieve-db] upsert t failed: fetch failed',
      '[nieve-db] upsert t failed: upsert t timed out after 5 ms',
    ]);
  });
});

describe('runSafely', () => {
  test('returns the fallback instead of throwing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      runSafely('step', async () => {
        throw new Error('boom');
      }, 'fallback'),
    ).resolves.toBe('fallback');
  });
});

describe('resort dates', () => {
  test('uses the local date in America/Argentina/Mendoza', () => {
    expect(resortLocalDate('2026-07-24T02:30:00Z')).toBe('2026-07-23');
    expect(resortLocalDate('2026-07-24T03:00:00Z')).toBe('2026-07-24');
    expect(resortLocalDate('2026-07-23T21:00:00-03:00')).toBe('2026-07-23');
    expect(resortLocalDate('not a date')).toBeNull();
  });

  test('adds calendar days across month boundaries', () => {
    expect(addCalendarDays('2026-09-23', -60)).toBe('2026-07-25');
    expect(addCalendarDays('2026-07-31', 1)).toBe('2026-08-01');
  });
});
