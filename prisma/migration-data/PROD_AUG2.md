# Production Aug 2 Cutover Runbook

**Target:** Sunday Aug 2, 2026 00:00 America/Chicago (or set `SOURCES_CUTOVER_DATE` if deploy lags).

## Before Aug 2

1. Deploy application code with cutover gate **off** (default date). No customer-visible change.
2. Client proofreads and marks KEEP/DELETE on:
   - `prisma/migration-data/client-review/seed_sources.csv`
   - `prisma/migration-data/client-review/seed_loadtypes_with_services.csv`
3. Rehearse on staging using `STAGING_REHEARSAL.md`.

## Aug 2 maintenance window

### 1. Schema (if not already applied)

Run step 1 from `aug2_cutover.sql`:

```sql
ALTER TABLE Loads ADD COLUMN SourceID INT NULL, ...;
ALTER TABLE Jobs ADD COLUMN SourceID INT NULL, ...;
ALTER TABLE Weeklies ADD COLUMN SourceID INT NULL, ...;
```

(Full statements in `aug2_cutover.sql`.)

### 2. Insert Sources

From approved `seed_sources.csv` (KEEP rows only):

```sql
INSERT INTO Sources (Name, ShortName) VALUES ('Fruitland', 'FRUIT');
-- ... repeat for all KEEP rows
```

### 3. Reset LoadTypes auto-increment

```sql
ALTER TABLE LoadTypes AUTO_INCREMENT = 10000;
```

### 4. Insert clean LoadTypes

From approved `seed_loadtypes_with_services.csv` (KEEP rows only):

```sql
INSERT INTO LoadTypes (Description, Deleted) VALUES ('ASPHALT', 0);
INSERT INTO LoadTypes (Description, Deleted) VALUES ('ASPHALT (HOURLY)', 0);
-- ... repeat for all KEEP rows (IDs assign 10000+)
```

### 5. Deploy / verify gate

- Ensure `SOURCES_CUTOVER_FORCE` is **not** set in production.
- Default `SOURCES_CUTOVER_DATE` (`2026-08-02T00:00:00-05:00`) activates cutover at midnight Central.
- If deploy completes after midnight, set `SOURCES_CUTOVER_DATE` to an earlier instant for that deploy.

### 6. Smoke test

- [ ] Sidenav shows Sources + Reports
- [ ] New load uses clean LoadType + Source
- [ ] Legacy open Job still works on old LoadTypes
- [ ] Invoice PDF shows `formatMaterial` labels

## After cutover (Aug–Sept)

- Finish legacy open Jobs on `LoadTypeID < 10000`
- Soft-delete unused legacy LoadTypes when open Jobs clear
- Remove cutover gate code and env vars when migration is complete (~Sept+)
