# Snow Monitor v3 — Hourly Forecast and Scores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed 72-hour multimodel forecast, precipitation phase, estimated snow quality, activity scores, and best-time recommendations.

**Architecture:** `/api/hourly` fetches Base, Media, and Alta in one request per model and returns normalized hourly records. Pure domain modules classify phase and quality, aggregate three-hour windows, and calculate explainable Powder, Pista, and Freeride scores. React consumes only typed contracts.

**Tech Stack:** TypeScript 5.9, React 19, TanStack Query, Open-Meteo, Vitest, Vite.

## Global Constraints

- No Supabase or remote database.
- No OpenSnow private or copied data.
- Preserve partial results when one model fails.
- Never turn missing values into zero, open, or closed.
- Branch `feat/snow-monitor-v3` must remain disabled in Vercel previews.

---

### Task 1: Hourly data contract and Open-Meteo adapter

**Files:**
- Create: `src/types/hourly.ts`
- Create: `src/lib/forecast/hourly.ts`
- Test: `src/lib/forecast/hourly.test.ts`

**Interfaces:**
- Produces: `fetchHourlyModel(model, fetchImpl): Promise<ModelHourlyResult>`
- Produces: `HourlyPoint`, `HourlyLevelForecast`, and `HourlyResponse`.

- [ ] **Step 1: Write failing tests** covering three locations in one Open-Meteo response, null preservation, timezone parsing, and a partial model response.

```ts
expect(parseHourlyLocations(payload, model)).toHaveLength(3);
expect(result[0].points[0].snowfallCm).toBe(2.4);
expect(result[1].points[0].visibilityM).toBeNull();
```

- [ ] **Step 2: Run** `npm test -- src/lib/forecast/hourly.test.ts` and verify failure because the module does not exist.
- [ ] **Step 3: Implement** typed hourly variables: snowfall, rain, precipitation, probability, temperature, apparent temperature, humidity, dew point, wind, direction, gusts, visibility, cloud cover, radiation, freezing level, snow depth, and day/night.
- [ ] **Step 4: Run the focused test** and verify PASS.
- [ ] **Step 5: Commit** `feat: add hourly multimodel adapter`.

### Task 2: Phase and quality classification

**Files:**
- Create: `src/lib/forecast/phase.ts`
- Create: `src/lib/forecast/quality.ts`
- Test: `src/lib/forecast/phase.test.ts`
- Test: `src/lib/forecast/quality.test.ts`

**Interfaces:**
- Consumes: `HourlyPoint`.
- Produces: `classifyPhase(point, elevationM): SnowPhaseResult`.
- Produces: `estimateSnowQuality(point, phase): SnowQualityResult`.

- [ ] **Step 1: Write failing table-driven tests** for `rain`, `mixed`, `wet-snow`, `dry-snow`, `none`, and `uncertain`.

```ts
expect(classifyPhase({ ...point, snowfallCm: 0, rainMm: 4, temperatureC: 2 }, 2240).phase).toBe('rain');
expect(classifyPhase({ ...point, snowfallCm: 3, temperatureC: -6 }, 3430).phase).toBe('dry-snow');
```

- [ ] **Step 2: Run focused tests** and verify failure.
- [ ] **Step 3: Implement conservative thresholds** using measured precipitation fields first, then temperature and freezing-level distance; return `uncertain` for conflicting or insufficient inputs.
- [ ] **Step 4: Add quality tests** for dry powder, dense powder, wet snow, wind-affected snow, crust/ice risk, and uncertain quality. Every result must include `reasons: string[]`.
- [ ] **Step 5: Implement minimal quality rules** without claiming observation certainty.
- [ ] **Step 6: Run both suites** and verify PASS.
- [ ] **Step 7: Commit** `feat: classify snow phase and quality`.

### Task 3: Three-hour windows and activity scores

**Files:**
- Create: `src/lib/forecast/scores.ts`
- Create: `src/lib/forecast/windows.ts`
- Test: `src/lib/forecast/scores.test.ts`
- Test: `src/lib/forecast/windows.test.ts`

**Interfaces:**
- Produces: `scoreWindow(window, context): ActivityScores`.
- Produces: `buildThreeHourWindows(level): ForecastWindow[]`.
- Produces: `findBestWindows(levels, operations): BestWindowSummary`.

- [ ] **Step 1: Write failing tests** ensuring scores remain between 0 and 100 and expose positive/negative reasons.
- [ ] **Step 2: Add the safety test:** when official off-piste status is closed, Freeride returns `{ status: 'blocked', score: null }` regardless of snowfall.
- [ ] **Step 3: Run focused tests** and verify failure.
- [ ] **Step 4: Implement weighted, capped factors** for snowfall, night share, phase, visibility, wind, gusts, temperature, radiation, observed depth, avalanche risk, and official operations.
- [ ] **Step 5: Implement three-hour aggregation** preserving minima/maxima and summing precipitation fields; never average categorical phase blindly.
- [ ] **Step 6: Implement best powder, piste, freeride, and best overall day selection** with deterministic tie-breaking by earlier time then higher confidence.
- [ ] **Step 7: Run focused tests** and verify PASS.
- [ ] **Step 8: Commit** `feat: add activity scores and best windows`.

### Task 4: `/api/hourly` and React presentation

**Files:**
- Create: `api/hourly.ts`
- Create: `api/hourly.test.ts`
- Create: `src/hooks/useHourlyForecast.ts`
- Create: `src/components/dashboard/BestWindows.tsx`
- Create: `src/components/dashboard/HourlyTimeline.tsx`
- Create: `src/components/dashboard/SnowPhaseQuality.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- `GET /api/hourly` returns `HourlyResponse` with `levels`, `models`, `bestWindows`, and `warnings`.

- [ ] **Step 1: Write API tests** for GET, 405, cache header, one failed model, and all-model failure.
- [ ] **Step 2: Implement the handler** with `s-maxage=3600, stale-while-revalidate=900` and a bounded retry for 429/5xx.
- [ ] **Step 3: Write component tests** for best-window copy, blocked freeride, mixed precipitation warning, loading, and partial error states.
- [ ] **Step 4: Implement mobile-first components** with text plus icons, three-hour navigation, and no horizontal table dependency.
- [ ] **Step 5: Integrate after road/mountain status placeholders and before daily cards.** Secondary loading must not hide the existing forecast.
- [ ] **Step 6: Run** `npm run lint && npm run typecheck && npm test && npm run build`.
- [ ] **Step 7: Commit** `feat: present hourly forecast and recommendations`.
