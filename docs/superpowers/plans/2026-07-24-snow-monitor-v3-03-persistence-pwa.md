# Snow Monitor v3 — Local Persistence and PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc browser storage with a versioned adapter, make the app installable and useful offline, and expand local alerts without claiming background push support.

**Architecture:** A `StorageAdapter` interface hides IndexedDB and localStorage implementations. The PWA caches only the application shell and last successful JSON responses. Alert evaluation remains client-side and runs when the page opens, refreshes, or stays active.

**Tech Stack:** TypeScript, IndexedDB, localStorage, Service Worker, Web App Manifest, React, Vitest.

## Global Constraints

- No backend, Supabase, authentication, or remote synchronization.
- Maximum 90 days of compact snapshots.
- Export and deletion must be explicit user actions.
- Service worker is same-origin only and must not cache external HTML.
- UI must state that alerts do not run with the app fully closed.

---

### Task 1: Versioned storage adapter

**Files:**
- Create: `src/lib/persistence/types.ts`
- Create: `src/lib/persistence/localStorageAdapter.ts`
- Create: `src/lib/persistence/indexedDbAdapter.ts`
- Create: `src/lib/persistence/storage.ts`
- Test: `src/lib/persistence/storage.test.ts`

**Interfaces:**

```ts
export interface StorageAdapter {
  get<T>(key: StorageKey): Promise<T | null>;
  set<T>(key: StorageKey, value: T): Promise<void>;
  remove(key: StorageKey): Promise<void>;
  exportAll(): Promise<StorageExport>;
  clearAll(): Promise<void>;
}
```

- [ ] Write failing contract tests shared by in-memory, localStorage, and IndexedDB-style adapters.
- [ ] Verify fallback to localStorage when IndexedDB open fails.
- [ ] Implement schema versioning and migrations from existing `las-lenas:*` keys.
- [ ] Add automatic cleanup for snapshots older than 90 days and hard item-count limits.
- [ ] Run tests and commit `feat: add versioned local persistence`.

### Task 2: Migrate history, preferences, favorites, and last-valid data

**Files:**
- Modify: `src/hooks/useForecastHistory.ts`
- Modify: `src/hooks/useAlertSettings.ts`
- Create: `src/hooks/useLocalPreferences.ts`
- Create: `src/hooks/useFavorites.ts`
- Create: `src/hooks/useLastValidResponse.ts`
- Test: corresponding hook and persistence tests.

- [ ] Write tests proving old localStorage data migrates without loss.
- [ ] Refactor hooks to depend on `StorageAdapter` rather than `window.localStorage` directly.
- [ ] Persist selected cota, chart period, favorite resorts, road state, and successful secondary endpoint responses.
- [ ] Show stale age and source timestamp when a last-valid response is used.
- [ ] Commit `refactor: use shared local storage adapter`.

### Task 3: Export and erase controls

**Files:**
- Create: `src/components/dashboard/LocalDataSettings.tsx`
- Test: `src/components/dashboard/LocalDataSettings.test.tsx`
- Modify: `src/App.tsx`

- [ ] Test export success, export failure, confirmation before erase, and UI reset.
- [ ] Implement JSON export with schema version and generated timestamp.
- [ ] Implement clear-all without touching unrelated origin storage keys.
- [ ] Put controls in the technical/details area, not the main forecast flow.
- [ ] Commit `feat: manage local snow monitor data`.

### Task 4: PWA manifest and service worker

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.svg`
- Create: `public/icons/icon-512.svg`
- Create: `src/pwa/register.ts`
- Create: `public/sw.js`
- Modify: `index.html`
- Modify: `src/main.tsx`
- Test: `src/pwa/register.test.ts`

- [ ] Write registration tests for unsupported browser, successful registration, update found, and registration failure.
- [ ] Add manifest metadata, theme colors, standalone display, and own-domain icons.
- [ ] Implement service-worker cache namespaces with version suffixes.
- [ ] Cache the shell using cache-first and same-origin API GET responses using stale-while-revalidate.
- [ ] Never cache non-GET, external URLs, failed JSON, or mutation responses.
- [ ] Commit `feat: make snow monitor installable`.

### Task 5: Offline and update experience

**Files:**
- Create: `src/hooks/usePwaStatus.ts`
- Create: `src/components/dashboard/PwaStatus.tsx`
- Create: `src/components/dashboard/OfflineNotice.tsx`
- Test: component tests.
- Modify: `src/App.tsx`

- [ ] Test offline with cached data, offline without cached data, install prompt, iOS manual-install instructions, and available update.
- [ ] Implement a non-blocking top notice and explicit reload action for new versions.
- [ ] Keep last-valid forecast visible offline and label its age.
- [ ] Commit `feat: add offline and update states`.

### Task 6: Expanded local alert evaluation

**Files:**
- Modify: `src/lib/forecast/alerts.ts`
- Modify: `src/lib/forecast/alerts.test.ts`
- Modify: `src/components/dashboard/AlertSettings.tsx`
- Modify: `src/hooks/useAlertSettings.ts`

- [ ] Add failing tests for gust threshold, rain at Base, RP 222 change, off-piste change, and large model-trend change.
- [ ] Add deduplication keys based on event, threshold, source timestamp, and selected cota.
- [ ] Evaluate on initial load, successful refresh, and foreground interval only.
- [ ] Explicitly display: `Estas alertas no funcionan con la app completamente cerrada.`
- [ ] Run full suite and commit `feat: expand local weather alerts`.
