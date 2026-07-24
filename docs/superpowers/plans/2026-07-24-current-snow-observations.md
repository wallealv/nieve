# Current Snow Observations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-ready “Nieve actual reportada” section that combines Las Leñas official observations with Snow-Forecast, Skiresort.info and OnTheSnow while preserving source freshness, provenance and partial-failure behavior.

**Architecture:** Keep observed snow separate from the numerical forecast. A new `/api/current-snow` serverless endpoint fetches four source pages with independent adapters, normalizes observations, deduplicates shared provenance groups, combines eligible values, and returns a stable JSON contract. The React client loads this endpoint independently through TanStack Query so forecast data remains usable when observation sources fail.

**Tech Stack:** React 19, Vite 8, TypeScript 5.9, TanStack Query, Vitest, Testing Library, Vercel Functions, native `fetch`, lightweight text parsing without browser automation.

## Global Constraints

- Las Leñas official data always has display priority.
- Never infer mid-mountain depth from base and summit.
- Never treat forecast snowfall as current snow depth.
- Freshness: fresh <=24h, aging >24h and <=72h, stale >72h, unknown when no reliable reported timestamp exists.
- Stale and unknown external values do not enter the combined reference.
- Sources sharing one provenance group count once toward consensus.
- No authentication bypass, CAPTCHAs, or anti-bot evasion.
- Endpoint cache: `s-maxage=3600`, `stale-while-revalidate=10800`.

---

### Task 1: Domain contract and freshness rules

**Files:**
- Create: `src/types/currentSnow.ts`
- Create: `src/lib/current-snow/freshness.ts`
- Test: `src/lib/current-snow/freshness.test.ts`

**Interfaces:**
- Produces: `SnowObservation`, `CurrentSnowZoneSummary`, `CurrentSnowResponse`, `classifyFreshness(reportedAt, now)`.

- [ ] **Step 1: Write failing freshness tests**

```ts
expect(classifyFreshness('2026-07-24T10:00:00Z', new Date('2026-07-24T20:00:00Z'))).toBe('fresh');
expect(classifyFreshness('2026-07-22T10:00:00Z', new Date('2026-07-24T20:00:00Z'))).toBe('aging');
expect(classifyFreshness('2026-07-20T10:00:00Z', new Date('2026-07-24T20:00:00Z'))).toBe('stale');
expect(classifyFreshness(null, new Date('2026-07-24T20:00:00Z'))).toBe('unknown');
```

- [ ] **Step 2: Run `npm test -- freshness.test.ts` and confirm failure because the module does not exist.**
- [ ] **Step 3: Add exact domain types from the approved spec and implement deterministic hour-based freshness classification.**
- [ ] **Step 4: Re-run the focused test and confirm PASS.**

### Task 2: Source adapters

**Files:**
- Create: `src/lib/current-snow/text.ts`
- Create: `src/lib/current-snow/sources/lasLenas.ts`
- Create: `src/lib/current-snow/sources/snowForecast.ts`
- Create: `src/lib/current-snow/sources/skiResortInfo.ts`
- Create: `src/lib/current-snow/sources/onTheSnow.ts`
- Test: `src/lib/current-snow/sources/sources.test.ts`

**Interfaces:**
- Consumes: `SnowObservation`.
- Produces: `parseLasLenas(html, fetchedAt)`, `parseSnowForecast(html, fetchedAt)`, `parseSkiResortInfo(html, fetchedAt)`, `parseOnTheSnow(html, fetchedAt)`.

- [ ] **Step 1: Add representative HTML/text fixtures covering:** official blank depth plus 3 cm in 24h; Snow-Forecast upper/lower depth; Skiresort mountain/base depth; OnTheSnow inch conversion.
- [ ] **Step 2: Run focused tests and confirm all parser imports fail.**
- [ ] **Step 3: Implement HTML-to-text normalization that removes scripts/styles, decodes common entities and collapses whitespace.**
- [ ] **Step 4: Implement Las Leñas parser for BASE/INTERMEDIA/CUMBRE rows; normalize dash or blank to `null`; mark provenance `las-lenas-official`.**
- [ ] **Step 5: Implement Snow-Forecast parser for upper/lower depth and report date; mark provenance `skiresort-network`. Do not parse model-predicted fresh snow into current depth.**
- [ ] **Step 6: Implement Skiresort.info parser for mountain/base depth and update date; mark provenance `skiresort-network`.**
- [ ] **Step 7: Implement OnTheSnow parser for base/summit inch values and report date; convert using `cm = inches * 2.54`; mark provenance `onthesnow-network`.**
- [ ] **Step 8: Re-run parser tests and confirm PASS.**

### Task 3: Combination service and API

**Files:**
- Create: `src/lib/current-snow/combine.ts`
- Create: `src/lib/current-snow/service.ts`
- Create: `src/lib/current-snow/combine.test.ts`
- Create: `src/lib/current-snow/service.test.ts`
- Create: `api/current-snow.ts`
- Create: `api/current-snow.test.ts`

**Interfaces:**
- Produces: `combineCurrentSnow(observations)`, `buildCurrentSnowResponse(fetcher?, now?)`, `createCurrentSnowHandler(loader)`.

- [ ] **Step 1: Write failing tests for official priority, external median across independent provenance groups, same-network deduplication, stale exclusion, and unavailable mid-mountain depth.**
- [ ] **Step 2: Run focused tests and confirm failure.**
- [ ] **Step 3: Implement combination by zone:** choose official value first; otherwise choose one most recent/complete observation per provenance group; median only when at least two independent groups remain; otherwise single-source reference.
- [ ] **Step 4: Add source configuration with fixed URLs, a browser-like but honest User-Agent, `Accept-Language`, an 8-second timeout and `Promise.allSettled`.**
- [ ] **Step 5: Return source statuses and warnings without throwing when at least one source succeeds. Throw only when all sources fail.**
- [ ] **Step 6: Implement GET-only API handler with `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=10800`; return structured 503 on total failure.**
- [ ] **Step 7: Run focused service/API tests and confirm PASS.**

### Task 4: React data flow and current-snow panel

**Files:**
- Create: `src/hooks/useCurrentSnow.ts`
- Create: `src/components/dashboard/CurrentSnowPanel.tsx`
- Create: `src/components/dashboard/CurrentSnowSources.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/format.ts`
- Test: `src/components/dashboard/CurrentSnowPanel.test.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `CurrentSnowResponse` from `/api/current-snow`.
- Produces: independent loading, data, stale-data and error states; coordinated manual refresh with forecast.

- [ ] **Step 1: Write failing component tests for official value, external consensus range, single-source warning, unavailable mid depth, and error panel that does not hide forecast.**
- [ ] **Step 2: Run focused UI tests and confirm failure.**
- [ ] **Step 3: Implement `useCurrentSnow` with one-hour stale/refetch intervals, retained previous data and a 12-second request timeout.**
- [ ] **Step 4: Implement three semantic zone cards with depth, source kind, 24h snow, freshness and external range.**
- [ ] **Step 5: Implement an expandable source table with source, depth, 24h snow, reported/retrieved time, freshness, quality and external link.**
- [ ] **Step 6: Insert the section after warnings and before forecast level cards. Header refresh must refetch both forecast and current snow.**
- [ ] **Step 7: Run focused UI tests and confirm PASS.**

### Task 5: Documentation, CI and production verification

**Files:**
- Modify: `README.md`
- Verify: `.github/workflows/ci.yml`

- [ ] **Step 1: Document observed-vs-forecast semantics, source priority, freshness windows, cache behavior and known source-blocking limitations.**
- [ ] **Step 2: Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`; all must exit 0.**
- [ ] **Step 3: Open a PR from `feat/current-snow-observations` to `main`; wait for CI and fix any failures.**
- [ ] **Step 4: Merge only after CI is green.**
- [ ] **Step 5: Verify Vercel production is READY, `/api/current-snow` returns 200 with source statuses, and `https://nieve.wallealv.com` renders the new section.**
