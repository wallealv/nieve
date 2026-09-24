import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('schema nieve migrations live in wallealv/wallealv-id, never in this repo', () => {
  const migrationsDir = join(repoRoot, 'supabase', 'migrations');
  const sqlFiles = existsSync(migrationsDir)
    ? readdirSync(migrationsDir, { recursive: true })
        .map(String)
        .filter((file) => file.toLowerCase().endsWith('.sql'))
    : [];

  expect(
    sqlFiles,
    'Las migraciones del esquema `nieve` viven en wallealv/wallealv-id (proyecto Supabase compartido). Movelas allí.',
  ).toEqual([]);
});
