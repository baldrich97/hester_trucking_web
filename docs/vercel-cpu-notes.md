# Vercel server CPU / usage notes

This app spends most **serverless time** on:

1. **`getServerSideProps` (GSSP)** — Many list and detail pages under `src/pages/` fetch Prisma data on every full page load (customers, loads, invoices, drivers, trucks, paystubs, etc.). Each navigation or hard refresh runs Node + Prisma again. **Mitigation:** narrow GSSP to auth/session only, move list data to client `trpc.useQuery`, or use ISR/static shells where data can be stale briefly.

2. **`/api/getPDF/*` routes** — PDF generation is CPU-heavy and holds a function until complete. **Mitigation:** cache where safe, reduce template complexity, or offload generation.

3. **Full page reloads** — `window.location.reload()` forces a full SSR round-trip. Prefer `trpc` cache invalidation + `router.replace` / soft state updates (see Pay Stub modal flow).

4. **Client TRPC** — `_app.tsx` already uses `httpBatchLink`, `staleTime: 30s`, and `refetchOnWindowFocus: false`, which reduces duplicate requests.

When enabling **Vercel Fluid Compute**, billing is tied to active CPU time; reducing GSSP + PDF + reloads has the largest impact.
