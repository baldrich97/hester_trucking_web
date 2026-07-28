# Testing gaps — running list

Track what is **not yet covered** or only **shallowly covered**. Update this file as suites are added.

**Legend:** `[x]` done · `[~]` partial · `[ ]` not started

---

## Load / job / rematch workflows

| Item | Status | Notes |
|------|--------|-------|
| `loads.put` create + rematch (legacy load type) | [x] | `tests/db/load-lifecycle.test.ts` |
| `loads.put` create + rematch (new-era + SourceID) | [x] | same file |
| Rematch reuses existing job on matching rates | [x] | same file |
| `loads.post` single update | [x] | `tests/db/load-workflows.test.ts` |
| `loads.post_mass_edit` | [x] | `load-lifecycle.test.ts` |
| `loads.post_mass_edit` Source reassign (new-era) + job rematch | [x] | `load-lifecycle.test.ts` |
| `loads.post` / `loads.post_mass_edit` company rate change → new weekly + job via rematch | [x] | `load-edit-rematch.test.ts` |
| `loads.put_duplicate_checker` / `post_duplicate_checker` | [x] | `tests/db/load-workflows.test.ts` |
| Open legacy jobs picker (`openLegacyJobs`) | [x] | mocked P0 + `load-workflows.test.ts`; progressive filters (driver/customer/week optional) in P0 |
| Inline catalog create during load entry (`sources.put`, `loadtypes.put` auto-ID ≥ 10000) | [x] | `cutover-inline-create.test.ts` |
| Weeklies `post` SourceID cascade | [x] | mocked P1 + `load-workflows.test.ts` |
| Jobs `postClosed` / `postPaid` | [x] | `tests/db/load-workflows.test.ts` |
| PaidOut job blocks rematch | [x] | `load-workflows.test.ts` (skips paid job, creates new) |

---

## Mass edit audit — traceability matrix (Jul 2026)

**Intent:** Red arrow selects all loads on a `JobID` (multi-day, multi-truck). Mass apply identity FKs + rates + week. Preserve per-ticket fields (ticket, weight, hours, amount, start date, truck). Block edits when job `PaidOut`. Sync amounts on open sheets only; closed revenues frozen.

**Non-goals:** Blocking edits on closed jobs/weeklies; hard-blocking `LastPrinted` dailies; orphan job cleanup.

| ID | Scenario | File | Status |
|----|----------|------|--------|
| PO-01 | Mass edit on paid job → BAD_REQUEST | `load-sheet-sync.test.ts` | [x] |
| PO-02 | `loads.post` on paid job → BAD_REQUEST | `load-sheet-sync.test.ts` | [x] |
| PO-03 | `loads.post` update on paid job → BAD_REQUEST | `load-sheet-sync.test.ts` | [x] |
| PO-04 | `loads.put` create on new unpaid job (regression) | `load-sheet-sync.test.ts` | [x] |
| PO-U1–U3 | `assertLoadsNotPaidOut` unit cases | `loadSheetSync.test.ts` | [x] |
| PO-R1 | Router calls guard before mass update | `mass-edit.test.ts` | [x] |
| PO-E1 | E2E paid job error toast | `mass-edit-job-scope.spec.ts` | [x] |
| JC-01–JC-04 | Closed job edit ok, revenues frozen | `load-sheet-sync.test.ts`, `load-edit-rematch.test.ts` | [x] |
| JC-U1–U2 | Unit: no job revenue writes; load TotalAmount recalc | `loadSheetSync.test.ts` | [x] |
| JC-E1 | E2E closed job mass edit | `mass-edit-job-scope.spec.ts` | [x] |
| WC-01–WC-03 | Closed weekly edit ok, Revenue frozen | `load-sheet-sync.test.ts` | [x] |
| WC-U1 | Unit: skip weekly Revenue write | `loadSheetSync.test.ts` | [x] |
| WC-R1 | Rematch target weekly open | `load-sheet-sync.test.ts` (WC-03) | [x] |
| WI-01–WI-03 | Invoiced weekly: no weekly writes | `load-sheet-sync.test.ts` | [x] |
| WI-U1 | Unit: skip TotalWeight when invoiced | `loadSheetSync.test.ts` | [x] |
| OS-01–OS-05 | Open sheet TotalAmount + TotalWeight sync | `load-sheet-sync.test.ts`, `mass-edit-selection.test.ts` | [x] |
| OS-U1–U4 | Unit sync logic | `loadSheetSync.test.ts` | [x] |
| LP-01–LP-02 | Daily LastPrinted warning only | `load-sheet-sync.test.ts` | [x] |
| ME-01–ME-20 | JobID selection, fields, rematch | `mass-edit-selection.test.ts` | [x] |
| ME-21–ME-22 | Router massData / getByJobId | `mass-edit.test.ts` | [x] |
| ME-C1–ME-C6 | MassEditLoadsTable component | `MassEditLoadsTable.test.tsx` | [x] |
| ME-C7–ME-C8 | PartialLoad no truck + confirm | `PartialLoad.test.tsx` | [x] |
| ME-E1–ME-E9 | E2E discovery, arrow, table UX | `mass-edit-job-scope.spec.ts` | [x] |

---

## Table filtering / sorting / pagination

| Table / endpoint | Mocked where-clause tests | DB deterministic tests |
|------------------|---------------------------|-------------------------|
| `loads.getAllPage` / `getCount` / `getUninvPage` | [x] | [x] |
| `invoices.getAllPage` / `getCount` / tabs | [x] | [x] `table-filters-entities.test.ts` |
| `customers.searchPage` | [x] | [x] `table-filters-entities.test.ts` |
| `drivers.search` | [x] | [x] `table-filters-operations.test.ts` |
| `trucks.search` | [x] | [x] `table-filters-operations.test.ts` |
| `sources.searchPage` | [x] | [x] `table-filters-entities.test.ts` |
| `loadtypes.searchPage` | [x] | [x] `table-filters-operations.test.ts` |
| `paystubs.search` | [x] | [x] `table-filters-operations.test.ts` |
| `dailies.getByWeek` / `getNotPrinted` | [x] | [x] `table-filters-sheets.test.ts` |
| `weeklies.getByWeek` / `getNotPrinted` / `getByCustomer` | [x] | [x] `table-filters-sheets.test.ts` |
| GenericTable UI (modal, sort click, pagination) | [x] | `tests/components/GenericTable.test.tsx` + E2E mass edit filter |

---

## DB integration lifecycles

| Suite | Status |
|-------|--------|
| Cutover rematch (direct helper) | [x] `cutover-loads.test.ts` |
| Invoice create + mark invoiced | [x] `invoice-lifecycle.test.ts` |
| Paystub create + PaidOut | [x] `paystub-lifecycle.test.ts` |
| Sources admin CRUD | [x] `sources-admin.test.ts` |
| PDF generation (7 routes) | [x] `pdf-generation.test.ts` |
| Load create via tRPC | [x] `load-lifecycle.test.ts` |
| Mass edit via tRPC | [x] `load-lifecycle.test.ts` |
| Table filters (loads, invoices, customers, sources, drivers, trucks, paystubs, loadtypes, dailies, weeklies) | [x] `load-lifecycle.test.ts`, `table-filters-entities.test.ts`, `table-filters-operations.test.ts`, `table-filters-sheets.test.ts` |
| Consolidated invoices | [x] | `invoice-consolidated.test.ts` |
| Dailies / weeklies print flags | [~] | `getNotPrinted` via tRPC; `weeklies.postClosed` in `sheet-close.test.ts` |
| Driver forms compliance (DB) | [x] | `compliance-carriers.test.ts` |
| Carriers compliance | [x] | `compliance-carriers.test.ts` (CRUD + hub is static page) |

---

## Router behavioral depth (beyond matrix reachability)

| Router | Coverage | Gap |
|--------|----------|-----|
| `compliance.ts` | ~42% | Expiring-soon windows tested (`router-depth.test.ts`); carrier-form detail branches remain |
| `dailies.ts` | ~86% | W2 + operator queries mocked (`router-depth.test.ts`); not-printed SQL covered via DB tests |
| `trucksdriven.ts` | 100% | Search + recommend + dedupe (`router-depth.test.ts`) |
| `reports.ts` | ~99% | Audit edge cases: date order, missing source/customer, grouping (`router-depth.test.ts`) |
| `invoices.ts` | ~70% | `put` from weekly, `postPaid`, consolidated DB tests added |
| `loadRematch.ts` | 100% lines | Existing-daily branches: reuse, paid-out throw, rate-mismatch creates (`router-depth.test.ts`) |

---

## E2E

| Item | Status |
|------|--------|
| Auth setup (admin) | [x] |
| 26 list-route smoke | [x] |
| Shallow submit flows | [x] |
| Full load submit (autocomplete) | [x] | `submit-flows.spec.ts` (legacy prefill or autocomplete fallback) |
| Cutover load entry (seeded) | [x] | `cutover-load-entry.spec.ts`: progressive filter, legacy open-job submit, new-era seeded + inline Source, inline load type + Source submit, seeded Source in dropdown |
| Loads form inline create (all "New …" options) | [x] | `load-inline-create.spec.ts`: New Customer/Driver/Truck/Source/Load Type/Delivery Location + full new-work submit without leaving `/loads` |
| Mass edit apply | [x] | `submit-flows.spec.ts`, `mass-edit-job-scope.spec.ts` (JobID scope) |
| Invoice create from weeklies | [x] | Full UI submit in `invoice-submit.spec.ts` against a seeded `[TEST]` customer + weekly (isolated, cleaned up); DB variant in `invoice-weekly-create.test.ts` |
| Driver compliance flows | [x] | `compliance-flows.spec.ts`: w2_forms file + remove via modal/confirm, expiring-soon CDL listing, form-options edit + save (seeded `[TEST]` driver/form) |
| Detail pages `/loads/[id]`, etc. | [x] | `tests/e2e/detail-pages.spec.ts` |
| Page audit (timings + payloads) | [x] | `page-audit.spec.ts` / `npm run audit:pages` → `tests/reports/page-audit.{json,md}` |
| E2E DB cleanup | [x] | `tests/e2e/global-teardown.ts` deletes leftover 999xxx-ticket loads; specs clean their own `[TEST]` seeds via `TestRunTracker` |

---

## Components / UI

| Item | Status |
|------|--------|
| Load, GenericForm, Sidenav, RHAutocomplete, InvoiceLoads, AuditReportPage | [x] |
| GenericTable (sort, filter modal, pagination) | [x] | `GenericTable.test.tsx` |
| PartialLoad, MassEditLoadsTable, PayStub, DailySheet, WeeklySheet | [x] | `PartialLoad.test.tsx`, `MassEditLoadsTable.test.tsx`, `SheetComponents.test.tsx` |
| PDF printables (unit) | [x] | `PdfPrintables.test.tsx` renders real PDF buffers (paystub, invoice per-load/weekly/consolidated, source report) |
| DriverForms (w2 + oo) + DriverFormsExpiringSoon | [x] | `DriverFormsCompliance.test.tsx`: checkbox states, missing-required marker, file-via-modal, remove confirm, carrier grouping, truck vitals expand, expiring groups/collapse/refresh |
| Most object/collection components | [~] | Objects largely covered; remaining collections (`InvoiceWeeklies`, `ConsolidatedInvoices`) untested |

---

## Infrastructure

| Item | Status |
|------|--------|
| npm scripts + README (local workflow) | [x] |
| Cutover dev seed (`npm run seed:cutover`) | [x] | `scripts/seed-cutover-dev.mjs`: Sources + clean LoadTypes (ID ≥ 10000) from `client-review/seed_*.csv` KEEP rows, bumps `LoadTypes AUTO_INCREMENT`; idempotent, `--dry-run` / `--limit N`, refuses prod-like `DATABASE_URL` |
| Timing baselines (local regression check) | [x] |
| Coverage on pages/elements | [x] | `src/elements` + `src/components` now in coverage scope with per-dir thresholds; `src/pages` intentionally excluded (exercised by Playwright, not unit-renderable) |
| tRPC timing middleware (dev/test only) | [x] | `src/server/router/timing.ts` + app-router middleware: every procedure call recorded (500-sample ring buffer), slow calls logged as `[trpc slow] …` (threshold `TRPC_SLOW_MS`, default 300 ms; disable logs with `TRPC_TIMING=off`). No-op in production. Tests: `tests/unit/trpcTiming.test.ts` |

---

## Known production issues (tests expose, not fixed)

- `PayStubPrintable` null crash on invalid paystub ID
- Some PDF routes log “resolved without sending a response”
- `weeklies.getNotPrinted` remains the slowest single data query (~1.2s) — raw SQL over all weeklies/jobs/loads

---

## Performance fixes applied

- **`/drivers/owner_forms` SSR**: `TrucksDriven` now uses `distinct: ["TruckID"]` + narrow select (drops per-drive-event duplication and unused `LicensedIn`).
- **`compliance.driverFormsSummary` + `driverFormsExpiringSoon`**: same `TrucksDriven` trim on both queries.
- **Sidenav badges**: `staleTime` raised from 60s → 5 min for `driverFormsSummary` and `getOverdueCount`.
- **`/invoices` SSR**: dropped `Loads` include, customer slimmed to `{Name}`, only the default Unpaid tab is SSR'd (Paid/All/Consolidated lazy-load via existing tRPC queries on tab switch).

## Bugs found by E2E and fixed

- **License expiration off-by-one day**: `LicenseExpiration` is a `@db.Date` column (read back as UTC midnight); local `startOfDay` shifted it a day earlier, so expiring-soon showed the wrong date and treated today-expiring licenses as expired. Fixed with `dateOnlyToLocalDay` in `driverFormCompliance.ts` (caught by `compliance-flows.spec.ts`).
- **Invoice form kept showing the just-invoiced weekly**: the global 30s react-query `staleTime` meant the post-submit `weeklies.getByCustomer` refetch (enabled-flag toggle) never fired. Fixed with `staleTime: 0` on that query in `Invoice.tsx` (caught by `invoice-submit.spec.ts`).

---

## Performance findings (`npm run audit:pages`, dev server)

Full report: `tests/reports/page-audit.md` (regenerated each run; also runs as part of `test:e2e`). Re-run after the fixes above to compare.

Historical hot spots (now addressed unless noted):

- `/drivers/owner_forms` — was ~11.6 MB `__NEXT_DATA__` from unbounded `TrucksDriven` history (**fixed**).
- Sidenav badge batch — `driverFormsSummary` + `getOverdueCount` + `sourcesCutover` (~1s/page); summary query trimmed + badge `staleTime` 5 min (**partially fixed**; `weeklies.getNotPrinted` and `sourcesCutover` unchanged).
- `/invoices` SSR — was ~284 KB from 4×10 invoices with full `Loads` arrays (**fixed**).
- `weeklies.getNotPrinted` — slowest single data query (~1.2s); still open.
