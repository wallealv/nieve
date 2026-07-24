# Las Leñas Snow Monitor v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el monitor en una herramienta de decisión con resumen de tormenta, operación oficial, menor carga de red, mejor móvil, historial y alertas locales.

**Architecture:** El endpoint de pronóstico agrupará las tres cotas en una llamada por modelo y mantendrá degradación parcial. La UI derivará tormentas, historial y alertas mediante librerías puras y persistencia local. El servicio de observaciones incorporará páginas operativas oficiales sin acoplarlas a las fuentes externas.

**Tech Stack:** React 19, TypeScript estricto, Vite 8, TanStack Query, Recharts, Vitest, Vercel Functions.

## Global Constraints

- Sin servicios pagos ni variables de entorno nuevas.
- Las alertas locales se evalúan al abrir o actualizar la app; no se promete push con la app cerrada.
- Las Leñas oficial mantiene prioridad.
- Ausencia de datos siempre es `null`, nunca cero.
- Todo cambio debe pasar lint, typecheck, tests y build.

---

### Task 1: Batch multiubicación de Open-Meteo

**Files:**
- Modify: `src/lib/forecast/client.ts`
- Modify: `src/lib/forecast/service.ts`
- Modify: `src/lib/forecast/normalize.ts`
- Test: `src/lib/forecast/client.test.ts`
- Test: `src/lib/forecast/service.test.ts`

**Interfaces:**
- Produce: `fetchOpenMeteoModel(model, levels, fetchImpl): Promise<NormalizedModelLevel[]>`
- Consume: `MOUNTAIN_LEVELS`, `ForecastModelConfig`, `normalizeModelLevel`

- [ ] Write tests proving comma-separated latitude, longitude and elevation parameters and list-shaped responses.
- [ ] Run tests and confirm they fail against the single-level client.
- [ ] Implement one request per model, response cardinality validation and mapping by requested order.
- [ ] Add one retry for 429/5xx with a short injected delay.
- [ ] Update service orchestration from nine promises to three model promises while retaining per-level status.
- [ ] Run focused tests and commit.

### Task 2: Storm event detection

**Files:**
- Create: `src/lib/forecast/storm.ts`
- Create: `src/lib/forecast/storm.test.ts`
- Create: `src/components/dashboard/StormSummary.tsx`
- Modify: `src/components/dashboard/Header.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produce: `findPrimaryStorm(levels): StormEvent | null`
- Produce: `StormEvent` with dates, totals, ranges, peak, wind, freezing level and confidence.

- [ ] Write tests for continuous events, one-day gaps, classification and seven-day prioritization.
- [ ] Implement event derivation using existing daily model values.
- [ ] Add a prominent responsive summary component.
- [ ] Replace the old “first day >= 1 cm” header logic.
- [ ] Add component tests and commit.

### Task 3: Official mountain operations

**Files:**
- Create: `src/lib/current-snow/operations.ts`
- Create: `src/lib/current-snow/operations.test.ts`
- Modify: `src/lib/current-snow/service.ts`
- Modify: `src/types/currentSnow.ts`
- Create: `src/components/dashboard/OperationsStrip.tsx`
- Modify: `src/components/dashboard/CurrentSnowPanel.tsx`

**Interfaces:**
- Produce: `fetchLasLenasOperations(fetchedAt): Promise<CurrentSnowOperations>`
- Extend `CurrentSnowOperations` with conditional lifts, open/total slopes, off-piste status and official note.

- [ ] Add fixtures for textual and image-alt states on lifts and slopes plus avalanche risk.
- [ ] Implement conservative parsers that emit `null` on ambiguous state.
- [ ] Fetch official operational pages with independent timeout/failure handling.
- [ ] Render only metrics that are available.
- [ ] Add tests and commit.

### Task 4: Mobile source cards and sticky level selector

**Files:**
- Modify: `src/components/dashboard/CurrentSnowSources.tsx`
- Create: `src/components/dashboard/StickyLevelSelector.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/dashboard/CurrentSnowSources.test.tsx`

**Interfaces:**
- Produce a shared level-selection callback using existing `LevelId`.

- [ ] Add a mobile card rendering test and desktop table accessibility test.
- [ ] Implement CSS-responsive card/table variants.
- [ ] Add sticky level selector above detailed forecast sections.
- [ ] Verify minimum touch target sizes and commit.

### Task 5: Lazy loading and chunking

**Files:**
- Modify: `src/App.tsx`
- Modify: `vite.config.ts`
- Create: `src/components/dashboard/SectionSkeleton.tsx`

- [ ] Wrap heavy below-fold sections with `React.lazy` and `Suspense`.
- [ ] Configure stable chunk groups for Recharts and React only when Vite supports them.
- [ ] Build and verify separate chunks are emitted.
- [ ] Add a smoke test for fallback rendering and commit.

### Task 6: Local forecast history

**Files:**
- Create: `src/lib/forecast/history.ts`
- Create: `src/lib/forecast/history.test.ts`
- Create: `src/hooks/useForecastHistory.ts`
- Create: `src/components/dashboard/ForecastHistory.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produce: `ForecastSnapshot`, `appendForecastSnapshot`, `forecastTrend`.

- [ ] Write tests for deduplication, 30-record cap, 45-day retention and previous-run delta.
- [ ] Implement storage adapter with memory fallback.
- [ ] Save snapshots after forecast and current snow are available.
- [ ] Render delta and recent trend without overstating observed-vs-forecast accuracy.
- [ ] Add component tests and commit.

### Task 7: Local alert settings

**Files:**
- Create: `src/lib/forecast/alerts.ts`
- Create: `src/lib/forecast/alerts.test.ts`
- Create: `src/hooks/useAlertSettings.ts`
- Create: `src/components/dashboard/AlertSettings.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produce: `AlertSettings`, `evaluateAlert`, `alertFingerprint`.

- [ ] Test threshold, confidence, selected-zone and deduplication rules.
- [ ] Implement defaults: 25 cm/72 h, 40 cm/7 d, confidence Media, any zone.
- [ ] Add local persistence and safe Notifications API integration.
- [ ] Render active/inactive state and settings controls.
- [ ] Add tests and commit.

### Task 8: Integration, docs and deployment

**Files:**
- Modify: `README.md`
- Modify: `src/App.test.tsx`

- [ ] Update end-to-end component fixtures for all new hooks and sections.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build` and inspect chunk output.
- [ ] Open a PR to `main`.
- [ ] Verify GitHub Actions and Vercel preview.
- [ ] Test `/`, `/api/forecast`, `/api/current-snow` on preview.
- [ ] Squash merge and verify production aliases.
