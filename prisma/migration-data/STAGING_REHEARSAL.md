# Staging Cutover Rehearsal Checklist

Run on staging with cutover forced on:

```env
SOURCES_CUTOVER_FORCE=true
NEXT_PUBLIC_SOURCES_CUTOVER_FORCE=true
```

Both variables are required for local cutover testing. The client flag alone shows Sources in the sidenav but **does not** enable open-job detection or new-era load types — those are server-side.

## Pre-flight

- [ ] Apply schema (`SourceID` on Loads, Jobs, Weeklies) via `aug2_cutover.sql` step 1 or `prisma db push`
- [ ] Insert test Sources from a subset of `client-review/seed_sources.csv`
- [ ] Set `ALTER TABLE LoadTypes AUTO_INCREMENT = 10000` and insert a few test LoadTypes from `seed_loadtypes_with_services.csv`
- [ ] Deploy app build with cutover gate code

## Legacy open-job path

- [ ] Create a load on a legacy LoadType (`ID < 10000`) for a driver/week
- [ ] Start a second load same driver/week — verify open-jobs banner, table, and OpenJob LoadType group
- [ ] Click table row — form prefills Customer, LoadType, location, rates; no Source field
- [ ] Submit — load attaches to same Job

## New-era path

- [ ] Same driver/week, click **New work instead**
- [ ] LoadType picker shows `ID >= 10000` catalog only
- [ ] Source select visible; pick Source + clean LoadType
- [ ] Submit — new Weekly/Job created with `SourceID` set on Load, Job, Weekly

## Mass edit

- [ ] Select multiple loads on `/loads/massedit`
- [ ] Mass-edit Source + LoadType for new-era loads
- [ ] Confirm `SourceID` persists and rematch respects Source in keys

## Invoicing & print

- [ ] Invoice loads/weeklies — material shows `ASPHALT (FRUIT)` via `formatMaterial`
- [ ] Daily sheet PDF and on-screen display
- [ ] Weekly sheet PDF and on-screen display
- [ ] Pay stub PDF
- [ ] Reports: By Source filters `Loads.SourceID`; By Customer shows Source column

## Navigation

- [ ] With force flag off — Sources and Reports hidden in sidenav
- [ ] With force flag on — Sources and Reports visible and functional

## Gate off (prod simulation)

- [ ] Remove force flags; confirm app matches pre-cutover behavior
- [ ] API rejects `LoadTypeID >= 10000` on load create
- [ ] `SourceID` not written on load create/update
