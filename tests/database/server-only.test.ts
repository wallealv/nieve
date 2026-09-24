import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
const databaseDir = join(srcDir, 'lib', 'database');

// The database module holds the Supabase secret key: only api/*.ts may import it. Nothing else
// under src/ (which Vite may bundle for the browser) can reach it or supabase-js.
test('browser code never imports the database module or supabase-js', () => {
  const offenders = readdirSync(srcDir, { recursive: true })
    .map(String)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => join(srcDir, file))
    .filter((file) => !file.startsWith(databaseDir))
    .filter((file) =>
      /from\s+['"]([^'"]*\/database\/[^'"]*|@supabase\/[^'"]*)['"]|import\(\s*['"]@supabase\//.test(
        readFileSync(file, 'utf8'),
      ),
    )
    .map((file) => relative(srcDir, file));

  expect(offenders).toEqual([]);
});

test('the secret key is never read from a VITE_-prefixed variable', () => {
  const source = readdirSync(databaseDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => readFileSync(join(databaseDir, file), 'utf8'))
    .join('\n');

  expect(source).toContain('SUPABASE_SECRET_KEY');
  expect(source).not.toMatch(/VITE_SUPABASE|import\.meta\.env/);
});
