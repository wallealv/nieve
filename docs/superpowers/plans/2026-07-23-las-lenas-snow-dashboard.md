# Las Leñas Snow Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a polished React + Vite dashboard that combines ECMWF, GFS and ICON forecasts to show snow accumulation, uncertainty and mountain conditions at three Las Leñas elevations for up to 15 days.

**Architecture:** A Vite React client requests a single `/api/forecast` Vercel Function. The function queries model-specific Open-Meteo endpoints for three configured mountain points, normalizes the hourly series, aggregates daily values, calculates a median multimodel consensus and confidence score, and returns one stable contract. Pure domain functions remain independent from networking and are covered by Vitest.

**Tech Stack:** React, Vite, TypeScript strict mode, Tailwind CSS v4 through `@tailwindcss/vite`, TanStack Query, Recharts, Lucide React, Vitest, React Testing Library, Vercel Functions.

## Global Constraints

- Show exactly 15 forecast days in the main view.
- Treat days 0–7 as operational, days 8–10 as extended, and days 11–15 as low-confidence guidance.
- Use ECMWF, GFS and ICON where each model has data; never replace unavailable model values with zero.
- Use the median as the primary consensus value and expose minimum and maximum.
- Use three independently requested points: base 2,240 m, mid mountain 2,800 m, summit 3,430 m.
- Automatically refetch every three hours and provide a manual refresh action.
- Continue with partial data if one model fails.
- Keep the first release stateless: no authentication, database or historical persistence.
- Pass `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build`.

---

## Planned file map

```text
api/forecast.ts                         Vercel HTTP entry point
src/config/mountain.ts                  resort, levels, horizons and model config
src/types/forecast.ts                   public API and domain types
src/lib/forecast/math.ts                pure median, range and aggregation helpers
src/lib/forecast/confidence.ts          confidence score and horizon classification
src/lib/forecast/normalize.ts           Open-Meteo hourly normalization and daily aggregation
src/lib/forecast/openMeteo.ts           model-specific HTTP client
src/lib/forecast/service.ts             orchestration and partial-failure handling
src/hooks/useForecast.ts                TanStack Query integration
src/components/dashboard/*              page-level dashboard sections
src/components/charts/*                 Recharts visualizations
src/components/ui/*                     local reusable primitives
src/test/*                               setup, fixtures and tests
src/App.tsx                              application composition
src/main.tsx                             React and QueryClient bootstrap
src/index.css                            Tailwind import and visual tokens
```

### Task 1: Scaffold the tested React application

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/test/setup.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces: a strict TypeScript React application with Vitest, jsdom and Tailwind v4.

- [ ] **Step 1: Add the application manifest**

```json
{
  "name": "las-lenas-snow-monitor",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "latest",
    "lucide-react": "latest",
    "react": "latest",
    "react-dom": "latest",
    "recharts": "latest"
  },
  "devDependencies": {
    "@eslint/js": "latest",
    "@tailwindcss/vite": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "eslint": "latest",
    "eslint-plugin-react-hooks": "latest",
    "eslint-plugin-react-refresh": "latest",
    "globals": "latest",
    "jsdom": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "typescript-eslint": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Configure Vite, Tailwind and tests**

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add the bootstrap and a smoke test**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders the product name', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /Las Leñas Snow Monitor/i })).toBeInTheDocument();
});
```

```tsx
// src/App.tsx
export function App() {
  return <h1>Las Leñas Snow Monitor</h1>;
}
```

- [ ] **Step 4: Install and verify the scaffold**

Run: `npm install && npm run test && npm run typecheck`

Expected: one passing test and no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold snow dashboard"
```

### Task 2: Define mountain and forecast domain contracts

**Files:**
- Create: `src/config/mountain.ts`
- Create: `src/types/forecast.ts`
- Test: `src/config/mountain.test.ts`

**Interfaces:**
- Produces: `MOUNTAIN_LEVELS`, `FORECAST_MODELS`, `ForecastResponse`, `LevelDailyForecast`, `ModelStatus` and `ForecastBand`.

- [ ] **Step 1: Write a failing configuration test**

```ts
import { MOUNTAIN_LEVELS } from './mountain';

test('defines three ordered Las Leñas levels', () => {
  expect(MOUNTAIN_LEVELS.map((level) => level.elevationM)).toEqual([2240, 2800, 3430]);
});
```

- [ ] **Step 2: Add exact domain types**

```ts
export type LevelId = 'base' | 'mid' | 'summit';
export type ModelId = 'ecmwf' | 'gfs' | 'icon';
export type ForecastBand = 'operational' | 'extended' | 'guidance';
export type ConfidenceLabel = 'Alta' | 'Media' | 'Baja' | 'Muy baja';

export interface MountainLevelConfig {
  id: LevelId;
  name: string;
  elevationM: number;
  latitude: number;
  longitude: number;
}

export interface ModelValue {
  model: ModelId;
  snowfallCm: number | null;
  source: 'direct' | 'estimated';
}

export interface LevelDailyForecast {
  date: string;
  band: ForecastBand;
  snowfallMedianCm: number | null;
  snowfallMinCm: number | null;
  snowfallMaxCm: number | null;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  modelCount: number;
  models: ModelValue[];
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  freezingLevelM: number | null;
}
```

- [ ] **Step 3: Add central configuration**

```ts
export const MOUNTAIN_LEVELS = [
  { id: 'base', name: 'Base', elevationM: 2240, latitude: -35.1486, longitude: -70.0811 },
  { id: 'mid', name: 'Montaña media', elevationM: 2800, latitude: -35.1437, longitude: -70.0961 },
  { id: 'summit', name: 'Alta montaña', elevationM: 3430, latitude: -35.1376, longitude: -70.1118 },
] as const satisfies readonly MountainLevelConfig[];

export const FORECAST_MODELS = [
  { id: 'ecmwf', endpoint: 'https://api.open-meteo.com/v1/ecmwf', forecastDays: 15 },
  { id: 'gfs', endpoint: 'https://api.open-meteo.com/v1/gfs', forecastDays: 16 },
  { id: 'icon', endpoint: 'https://api.open-meteo.com/v1/dwd-icon', forecastDays: 8 },
] as const;
```

- [ ] **Step 4: Run and commit**

Run: `npm run test -- src/config/mountain.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add src/config src/types
git commit -m "feat: define Las Leñas forecast domain"
```

### Task 3: Implement pure aggregation and confidence calculations with TDD

**Files:**
- Create: `src/lib/forecast/math.ts`
- Create: `src/lib/forecast/confidence.ts`
- Test: `src/lib/forecast/math.test.ts`
- Test: `src/lib/forecast/confidence.test.ts`

**Interfaces:**
- Produces: `median(values)`, `nullableRange(values)`, `sumNullable(values)`, `bandForDay(dayIndex)`, `calculateConfidence(input)`.

- [ ] **Step 1: Write failing median and missing-data tests**

```ts
import { median, nullableRange, sumNullable } from './math';

test('median ignores null values and handles even counts', () => {
  expect(median([4, null, 10, 8, 6])).toBe(7);
});

test('range returns nulls when every value is absent', () => {
  expect(nullableRange([null, null])).toEqual({ min: null, max: null });
});

test('sum keeps an all-null series absent', () => {
  expect(sumNullable([null, null])).toBeNull();
});
```

- [ ] **Step 2: Implement minimal pure math helpers**

```ts
export function compact(values: readonly (number | null | undefined)[]): number[] {
  return values.filter((value): value is number => Number.isFinite(value));
}

export function median(values: readonly (number | null | undefined)[]): number | null {
  const sorted = compact(values).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function nullableRange(values: readonly (number | null | undefined)[]) {
  const present = compact(values);
  return present.length ? { min: Math.min(...present), max: Math.max(...present) } : { min: null, max: null };
}

export function sumNullable(values: readonly (number | null | undefined)[]): number | null {
  const present = compact(values);
  return present.length ? present.reduce((total, value) => total + value, 0) : null;
}
```

- [ ] **Step 3: Write confidence tests**

```ts
import { bandForDay, calculateConfidence } from './confidence';

test.each([[0, 'operational'], [7, 'operational'], [8, 'extended'], [10, 'extended'], [11, 'guidance'], [14, 'guidance']])(
  'classifies day %i as %s',
  (day, band) => expect(bandForDay(day)).toBe(band),
);

test('penalizes dispersion, horizon and missing models', () => {
  expect(calculateConfidence({ values: [20, 21, 22], dayIndex: 1, expectedModels: 3 }).score)
    .toBeGreaterThan(calculateConfidence({ values: [5, 20], dayIndex: 12, expectedModels: 3 }).score);
});
```

- [ ] **Step 4: Implement confidence scoring**

```ts
export function bandForDay(dayIndex: number): ForecastBand {
  if (dayIndex <= 7) return 'operational';
  if (dayIndex <= 10) return 'extended';
  return 'guidance';
}

export function calculateConfidence(input: {
  values: readonly (number | null)[];
  dayIndex: number;
  expectedModels: number;
}): { score: number; label: ConfidenceLabel } {
  const values = compact(input.values);
  if (!values.length) return { score: 0, label: 'Muy baja' };
  const center = median(values) ?? 0;
  const spread = Math.max(...values) - Math.min(...values);
  const dispersionPenalty = center > 1 ? Math.min(45, (spread / center) * 30) : Math.min(25, spread * 4);
  const horizonPenalty = input.dayIndex <= 7 ? 0 : input.dayIndex <= 10 ? 15 : 30;
  const coveragePenalty = Math.max(0, input.expectedModels - values.length) * 12;
  const score = Math.round(Math.max(0, Math.min(100, 100 - dispersionPenalty - horizonPenalty - coveragePenalty)));
  const label = score >= 75 ? 'Alta' : score >= 50 ? 'Media' : score >= 25 ? 'Baja' : 'Muy baja';
  return { score, label };
}
```

- [ ] **Step 5: Run and commit**

Run: `npm run test -- src/lib/forecast/math.test.ts src/lib/forecast/confidence.test.ts`

Expected: PASS.

```bash
git add src/lib/forecast
git commit -m "feat: calculate snow consensus confidence"
```

### Task 4: Normalize Open-Meteo data and orchestrate partial model failures

**Files:**
- Create: `src/lib/forecast/openMeteo.ts`
- Create: `src/lib/forecast/normalize.ts`
- Create: `src/lib/forecast/service.ts`
- Create: `src/test/fixtures/openMeteo.ts`
- Test: `src/lib/forecast/normalize.test.ts`
- Test: `src/lib/forecast/service.test.ts`

**Interfaces:**
- Consumes: domain types, model and mountain config, math and confidence helpers.
- Produces: `fetchForecast(): Promise<ForecastResponse>` and `normalizeModelLevel(model, level, payload)`.

- [ ] **Step 1: Add a stable fixture and failing normalization test**

```ts
const fixture = {
  hourly: {
    time: ['2026-07-23T00:00', '2026-07-23T01:00'],
    snowfall: [1.2, 0.8],
    temperature_2m: [-4, -3],
    wind_speed_10m: [18, 22],
    wind_gusts_10m: [30, 36],
    freezing_level_height: [1800, 1900],
  },
};

expect(normalizeModelLevel('gfs', MOUNTAIN_LEVELS[0], fixture)[0]).toMatchObject({
  date: '2026-07-23',
  snowfallCm: 2,
  temperatureMinC: -4,
  windMaxKmh: 22,
});
```

- [ ] **Step 2: Implement the model HTTP client**

Build URLs with:

```ts
const HOURLY_FIELDS = [
  'snowfall',
  'temperature_2m',
  'wind_speed_10m',
  'wind_gusts_10m',
  'freezing_level_height',
  'weather_code',
].join(',');

url.searchParams.set('latitude', String(level.latitude));
url.searchParams.set('longitude', String(level.longitude));
url.searchParams.set('elevation', String(level.elevationM));
url.searchParams.set('hourly', HOURLY_FIELDS);
url.searchParams.set('timezone', 'America/Argentina/Mendoza');
url.searchParams.set('forecast_days', String(model.forecastDays));
url.searchParams.set('wind_speed_unit', 'kmh');
```

Use `AbortSignal.timeout(12_000)`, reject non-2xx responses and validate that `hourly.time` exists before returning the payload.

- [ ] **Step 3: Implement daily normalization**

Group hourly rows by local ISO date. Sum snowfall, take temperature min/max, wind/gust maxima, and the median freezing level. Preserve missing arrays as `null`, not zero.

- [ ] **Step 4: Write the partial-failure test**

```ts
const fetcher = vi.fn(async (model: ModelId) => {
  if (model === 'icon') throw new Error('ICON unavailable');
  return fixture;
});

const result = await buildForecastResponse(fetcher);
expect(result.models.find((model) => model.id === 'icon')?.status).toBe('failed');
expect(result.levels[0].daily[0].modelCount).toBe(2);
expect(result.warnings).toContainEqual(expect.stringMatching(/ICON/i));
```

- [ ] **Step 5: Implement orchestration**

Use `Promise.allSettled` per model and level. A model is available when at least one level succeeds. Merge dates into exactly 15 daily slots, calculate model values, median, range and confidence, and return structured statuses and warnings.

- [ ] **Step 6: Run and commit**

Run: `npm run test -- src/lib/forecast/normalize.test.ts src/lib/forecast/service.test.ts`

Expected: PASS, including the degraded response test.

```bash
git add src/lib/forecast src/test/fixtures
git commit -m "feat: integrate multimodel weather forecasts"
```

### Task 5: Expose the Vercel forecast function

**Files:**
- Create: `api/forecast.ts`
- Test: `api/forecast.test.ts`

**Interfaces:**
- Consumes: `fetchForecast()`.
- Produces: `GET(request: Request): Promise<Response>`.

- [ ] **Step 1: Write handler tests**

```ts
expect((await GET(new Request('http://localhost/api/forecast'))).status).toBe(200);
expect((await POST()).status).toBe(405);
```

- [ ] **Step 2: Implement a Web Handler**

```ts
export async function GET(): Promise<Response> {
  try {
    const data = await fetchForecast();
    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=10800, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    return Response.json(
      { error: 'FORECAST_UNAVAILABLE', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(): Promise<Response> {
  return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
```

- [ ] **Step 3: Run and commit**

Run: `npm run test -- api/forecast.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add api
git commit -m "feat: expose forecast serverless endpoint"
```

### Task 6: Build the query hook and polished dashboard

**Files:**
- Create: `src/hooks/useForecast.ts`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/SegmentedControl.tsx`
- Create: `src/components/dashboard/Header.tsx`
- Create: `src/components/dashboard/LevelSummaryCard.tsx`
- Create: `src/components/dashboard/MountainProfile.tsx`
- Create: `src/components/dashboard/ModelStatusList.tsx`
- Create: `src/components/dashboard/ForecastTable.tsx`
- Create: `src/components/charts/SnowForecastChart.tsx`
- Create: `src/components/charts/ConditionsChart.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/index.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `ForecastResponse` from `/api/forecast`.
- Produces: responsive dashboard with level and period selection.

- [ ] **Step 1: Write dashboard interaction tests**

```tsx
render(<App />, { wrapper: createTestQueryWrapper(forecastFixture) });
expect(await screen.findByText('Alta montaña')).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: '15 días' }));
expect(screen.getByText(/Tendencia de baja confianza/i)).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /Actualizar/i }));
expect(mockRefetch).toHaveBeenCalled();
```

- [ ] **Step 2: Implement the query hook**

```ts
export function useForecast() {
  return useQuery({
    queryKey: ['las-lenas-forecast'],
    queryFn: async () => {
      const response = await fetch('/api/forecast');
      if (!response.ok) throw new Error('No se pudo cargar el pronóstico');
      return response.json() as Promise<ForecastResponse>;
    },
    refetchInterval: 3 * 60 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}
```

- [ ] **Step 3: Implement the visual system**

Use a deep navy background, a subtle radial snow glow, translucent bordered cards, large tabular numerals and accessible ice-blue accents. Define reusable CSS variables and `prefers-reduced-motion` behavior in `src/index.css`.

- [ ] **Step 4: Implement the summary and mountain profile**

Show 24 h, 72 h, 7 d and 15 d totals per level. The vertical mountain profile must position Base, Montaña media and Alta montaña along a stylized SVG ridge and update its values when the period selector changes.

- [ ] **Step 5: Implement charts**

`SnowForecastChart` uses bars for daily median, an `Area` for min/max uncertainty and a line for cumulative snowfall. Add visual background regions or reference areas for operational, extended and guidance bands. `ConditionsChart` displays temperature, wind/gusts and freezing level with readable tooltips.

- [ ] **Step 6: Implement model status and accessible table**

Display model success/failure and forecast coverage. The table is the textual alternative to charts and prints `No disponible` for absent model values.

- [ ] **Step 7: Run and commit**

Run: `npm run test -- src/App.test.tsx && npm run typecheck`

Expected: PASS.

```bash
git add src
git commit -m "feat: build responsive snow dashboard"
```

### Task 7: Complete deployment documentation and verification

**Files:**
- Create: `README.md`
- Create: `vercel.json` only when local Vercel detection requires it.
- Modify: tests and implementation only for defects found during verification.

**Interfaces:**
- Produces: documented, deployable and verified repository.

- [ ] **Step 1: Document operation and limitations**

README must include local commands, architecture, model horizons, confidence interpretation, cache behavior, deployment steps and the warning that 11–15 day snowfall is guidance rather than a precise local forecast.

- [ ] **Step 2: Run the complete verification suite**

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all commands exit with status 0.

- [ ] **Step 3: Run a browser verification**

Start `npm run dev`, load desktop and 390 px mobile widths, verify there are no console errors, confirm the API loading/error states, change level and period, and check that chart and table values agree.

- [ ] **Step 4: Final commit**

```bash
git add README.md src api package-lock.json

git commit -m "docs: finalize snow monitor delivery"
```

- [ ] **Step 5: Publish**

Push `feat/las-lenas-snow-dashboard` and open a draft pull request into `main` with test evidence and known forecast limitations.
