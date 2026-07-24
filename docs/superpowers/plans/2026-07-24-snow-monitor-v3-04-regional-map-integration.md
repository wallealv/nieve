# Snow Monitor v3 — Regional Comparison, Map, and Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compare seven South American ski areas, add a lazy regional snowfall map, and integrate all v3 panels into a coherent mobile-first application.

**Architecture:** Resort metadata is versioned in code. `/api/regional` reuses the existing forecast normalization over representative base and summit coordinates. `/api/regional-grid` returns a bounded preconfigured grid for a lazy MapLibre client; the map never requests an unbounded user-defined area.

**Tech Stack:** TypeScript, React, Open-Meteo, MapLibre GL JS, Vite dynamic imports, Vitest.

## Global Constraints

- Initial resorts: Las Leñas, Catedral, Chapelco, Cerro Castor, Valle Nevado, La Parva, El Colorado.
- Ranking is an estimate based on representative coordinates and must disclose that limitation.
- No OpenSnow layers, tiles, or proprietary data.
- Map loads only after explicit user interaction.
- All secondary failures remain isolated from Las Leñas core forecast.

---

### Task 1: Resort configuration and regional forecast service

**Files:**
- Create: `src/types/regional.ts`
- Create: `src/lib/regional/resorts.ts`
- Create: `src/lib/regional/service.ts`
- Test: `src/lib/regional/service.test.ts`

**Interfaces:**
- Produces: `REGIONAL_RESORTS: RegionalResortConfig[]`.
- Produces: `buildRegionalSummary(fetchImpl): Promise<RegionalResponse>`.

- [ ] Write failing tests for exactly seven unique resort IDs, valid coordinates/elevations, timezone, country, and official URL allowlist.
- [ ] Test batch forecast normalization with one resort failure and one missing model.
- [ ] Implement 72-hour and seven-day snowfall, model range, confidence, max gust, Base phase, estimated Powder score, and warnings.
- [ ] Preserve `null` for unavailable metrics.
- [ ] Commit `feat: add regional ski resort forecasts`.

### Task 2: Ranking and comparator endpoint

**Files:**
- Create: `src/lib/regional/ranking.ts`
- Test: `src/lib/regional/ranking.test.ts`
- Create: `api/regional.ts`
- Create: `api/regional.test.ts`

**Interfaces:**
- Produces: `rankRegionalResorts(items): RankedRegionalResort[]`.

- [ ] Write failing tests for snowfall, confidence, wind penalty, rain-at-base penalty, deterministic ties, and insufficient data.
- [ ] Implement an explainable score with `reasons` and `penalties`.
- [ ] Implement GET-only endpoint with three-hour CDN cache and partial warnings.
- [ ] Commit `feat: rank regional ski conditions`.

### Task 3: Comparator UI and favorites

**Files:**
- Create: `src/hooks/useRegionalForecast.ts`
- Create: `src/components/dashboard/RegionalComparator.tsx`
- Test: `src/components/dashboard/RegionalComparator.test.tsx`
- Modify: `src/App.tsx`

- [ ] Test mobile cards, desktop comparison, favorites, source error, stale fallback, and explanatory disclaimer.
- [ ] Implement sorting by overall rank, 72-hour snow, seven-day snow, Powder score, and wind.
- [ ] Persist favorites using the shared `StorageAdapter`.
- [ ] Lazy-load below the webcam panel.
- [ ] Commit `feat: compare regional ski resorts`.

### Task 4: Bounded regional grid endpoint

**Files:**
- Create: `src/lib/regional/grid.ts`
- Test: `src/lib/regional/grid.test.ts`
- Create: `api/regional-grid.ts`
- Create: `api/regional-grid.test.ts`

**Interfaces:**
- Produces: `REGIONAL_GRID` with a fixed maximum point count.
- Produces: snowfall/phase values for 6, 12, 24, 48, and 72 hours.

- [ ] Write tests for fixed bounds, no duplicate points, point-count ceiling, batched requests, and null preservation.
- [ ] Implement a coarse Andes/Patagonia grid; do not accept arbitrary query coordinates.
- [ ] Implement cache `s-maxage=10800, stale-while-revalidate=3600`.
- [ ] Commit `feat: expose bounded regional snowfall grid`.

### Task 5: Lazy MapLibre map

**Files:**
- Add dependency: `maplibre-gl` pinned in `package.json` and lockfile.
- Create: `src/components/map/RegionalSnowMap.tsx`
- Create: `src/components/map/RegionalSnowMapLoader.tsx`
- Create: `src/hooks/useRegionalGrid.ts`
- Test: map loader/component tests.
- Modify: `vite.config.ts`

- [ ] Write tests proving MapLibre is not imported or data-fetched before user opens the map.
- [ ] Add a button that dynamically imports the map and requests the grid.
- [ ] Render resort markers and text-accessible snowfall/phase summaries; colors must never be the sole encoding.
- [ ] Add time controls for 6/12/24/48/72 hours and reduced-motion behavior.
- [ ] Split MapLibre into its own vendor chunk and verify bundle output.
- [ ] Commit `feat: add lazy regional snowfall map`.

### Task 6: Final application integration and accessibility

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `README.md`
- Modify: `src/components/dashboard/ForecastMethodology.tsx`

- [ ] Reorder content: storm/recommendation, road/mountain, best windows, hourly, phase/quality, daily, model evolution, webcam, comparator, map, history/alerts/methodology.
- [ ] Add landmark headings and skip-friendly IDs.
- [ ] Test keyboard operation, button names, loading isolation, stale states, and no-data copy.
- [ ] Document data sources, local-first limitations, PWA behavior, ranking limitations, and absence of closed-app push.
- [ ] Run `npm run lint && npm run typecheck && npm test && npm run build`.
- [ ] Inspect built chunks and confirm MapLibre and charts are lazy.
- [ ] Commit `feat: complete snow monitor v3`.

### Task 7: PR, CI, and production verification

- [ ] Confirm `feat/snow-monitor-v3` produced no Vercel preview deployments.
- [ ] Open one PR to `main` with all features and verification evidence.
- [ ] Run GitHub Actions until lint, TypeScript, tests, and build are green.
- [ ] Review changed files, external URL allowlists, cache policies, and bundle sizes.
- [ ] Squash merge once.
- [ ] Verify production page plus `/api/hourly`, `/api/model-runs`, `/api/road`, `/api/webcam`, `/api/regional`, and `/api/regional-grid`.
- [ ] Verify partial failure handling with at least one simulated unavailable source.
