# Snow Monitor v3 — Model Runs, RP 222, and Webcam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show whether each model is strengthening or weakening the forecast, normalize the official RP 222 road report, and expose safe webcam availability metadata.

**Architecture:** Historical model runs use an isolated Open-Meteo adapter and pure trend analysis. Road and webcam sources have independent endpoints, allowlists, explicit timeouts, stale fallback, and conservative parsers. All three panels are secondary and can fail without hiding weather data.

**Tech Stack:** TypeScript, Open-Meteo Single Runs API, Vercel Functions, React, TanStack Query, Vitest.

## Global Constraints

- No remote persistence.
- Never scrape or expose arbitrary external URLs supplied by clients.
- Never infer road status from forecast weather.
- Never embed untrusted HTML.
- Preserve the last valid local response with age metadata.

---

### Task 1: Previous-run contracts and adapter

**Files:**
- Create: `src/types/modelRuns.ts`
- Create: `src/lib/forecast/runs.ts`
- Test: `src/lib/forecast/runs.test.ts`

**Interfaces:**
- Produces: `fetchModelRuns(model, levels, fetchImpl): Promise<ModelRunSeries>`.
- Produces: `analyzeModelRuns(series): ModelTrendSummary`.

- [ ] Write failing tests for current, previous, and second previous run with one missing archive.
- [ ] Verify failure with `npm test -- src/lib/forecast/runs.test.ts`.
- [ ] Implement exact run identifiers per model from generated-at cadence, then request only supported archived runs.
- [ ] Normalize 72-hour and seven-day totals by cota.
- [ ] Implement states `up`, `down`, `stable`, `converging`, `diverging`, and `insufficient` using explicit tolerances.
- [ ] Run focused tests and commit `feat: compare recent model runs`.

### Task 2: Model-runs endpoint and panel

**Files:**
- Create: `api/model-runs.ts`
- Create: `api/model-runs.test.ts`
- Create: `src/hooks/useModelRuns.ts`
- Create: `src/components/dashboard/ModelRunEvolution.tsx`
- Modify: `src/App.tsx`

- [ ] Write API tests for partial archives, unsupported run, cache, and method rejection.
- [ ] Implement `GET /api/model-runs` with `s-maxage=10800, stale-while-revalidate=3600`.
- [ ] Write component tests for rising, falling, converging, and insufficient states.
- [ ] Implement a compact graph showing current plus two prior runs and textual deltas.
- [ ] Lazy-load the panel below the daily summary.
- [ ] Run focused and full suites; commit `feat: show model run evolution`.

### Task 3: RP 222 parser and endpoint

**Files:**
- Create: `src/types/road.ts`
- Create: `src/lib/road/parser.ts`
- Create: `src/lib/road/service.ts`
- Test: `src/lib/road/parser.test.ts`
- Create: `api/road.ts`
- Create: `api/road.test.ts`

**Interfaces:**
- Produces: `parseRoadReport(html, sourceUrl, fetchedAt): RoadStatus`.
- Road states: `open`, `caution`, `extreme-caution`, `chains-required`, `closed`, `unknown`.

- [ ] Write fixture-based tests for RP 222, Los Molles, Las Leñas, chains, machinery, ice, snow, interruption, publication date, and unrelated routes.
- [ ] Verify parser tests fail.
- [ ] Implement tag stripping, entity decoding, section extraction, and conservative normalization.
- [ ] Return `unknown` when the page lacks an RP 222 statement; never default to open.
- [ ] Implement fixed-source fetching with timeout and no client-provided URL.
- [ ] Add HTTP tests with `s-maxage=1800, stale-while-revalidate=1800`.
- [ ] Run tests and commit `feat: add official rp222 status`.

### Task 4: Road UI and local change detection

**Files:**
- Create: `src/hooks/useRoadStatus.ts`
- Create: `src/lib/road/history.ts`
- Create: `src/components/dashboard/RoadStatusCard.tsx`
- Test: `src/lib/road/history.test.ts`
- Test: `src/components/dashboard/RoadStatusCard.test.tsx`
- Modify: `src/App.tsx`

- [ ] Test previous versus current status and changes to chains, closure, and machinery.
- [ ] Implement a versioned localStorage snapshot with source timestamp and fetch timestamp.
- [ ] Test fresh, stale, blocked source, unknown, and changed-state cards.
- [ ] Implement the card directly below the storm summary, linking only to the allowlisted official report.
- [ ] Commit `feat: display rp222 status changes`.

### Task 5: Webcam availability and safe presentation

**Files:**
- Create: `src/types/webcam.ts`
- Create: `src/lib/webcam/service.ts`
- Test: `src/lib/webcam/service.test.ts`
- Create: `api/webcam.ts`
- Create: `api/webcam.test.ts`
- Create: `src/hooks/useWebcamStatus.ts`
- Create: `src/components/dashboard/WebcamCard.tsx`

- [ ] Write tests for reachable official page, blocked iframe, redirect, timeout, and invalid destination.
- [ ] Implement HEAD/GET probing against a fixed allowlist and return metadata only: official URL, checkedAt, status, embeddable flag, and message.
- [ ] Never proxy or store webcam image bytes.
- [ ] Implement the endpoint with one-hour CDN caching.
- [ ] Implement a lazy card with safe external-link behavior and clear fallback copy.
- [ ] Run full verification and commit `feat: add official webcam access`.
