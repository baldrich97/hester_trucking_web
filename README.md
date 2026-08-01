# Create T3 App

This is an app bootstrapped according to the [init.tips](https://init.tips) stack, also known as the T3-Stack.

## Why are there `.js` files in here?

As per [T3-Axiom #3](https://github.com/t3-oss/create-t3-app/tree/next#3-typesafety-isnt-optional), we take typesafety as a first class citizen. Unfortunately, not all frameworks and plugins support TypeScript which means some of the configuration files have to be `.js` files.

We try to emphasize that these files are javascript for a reason, by explicitly declaring its type (`cjs` or `mjs`) depending on what's supported by the library it is used by. Also, all the `js` files in this project are still typechecked using a `@ts-check` comment at the top.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with the most basic configuration and then move on to more advanced configuration.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next-Auth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [TailwindCSS](https://tailwindcss.com)
- [tRPC](https://trpc.io) (using @next version? [see v10 docs here](https://alpha.trpc.io))

Also checkout these awesome tutorials on `create-t3-app`.

- [Build a Blog With the T3 Stack - tRPC, TypeScript, Next.js, Prisma & Zod](https://www.youtube.com/watch?v=syEWlxVFUrY)
- [Build a Live Chat Application with the T3 Stack - TypeScript, Tailwind, tRPC](https://www.youtube.com/watch?v=dXRRY37MPuk)
- [Build a full stack app with create-t3-app](https://www.nexxel.dev/blog/ct3a-guestbook)
- [A first look at create-t3-app](https://dev.to/ajcwebdev/a-first-look-at-create-t3-app-1i8f)

## Testing

Three-tier harness — **local only** (run on your PC). Uses **only `.env` dev `DATABASE_URL`** for DB/E2E (never production). No CI or cloud test runners.

### npm scripts

| Script | Command | Database | Typical duration |
|--------|---------|----------|------------------|
| **`npm test`** | Unit + mocked tRPC matrix + component tests | **Never** | ~15–30s |
| **`npm run test:watch`** | Same as `npm test`, re-runs on save | **Never** | Continuous |
| **`npm run test:coverage`** | `npm test` + Istanbul coverage report | **Never** | ~20–35s |
| **`npm run test:db`** | Integration tests (rematch, invoices, paystubs, **PDF generation**) | **Yes** | ~30–90s |
| **`npm run test:e2e`** | Playwright: auth, route smoke, submit flows, invoice/compliance flows, page audit, PDF HTTP smoke | **Yes** (via app) | ~3–5 min |
| **`npm run test:e2e:ui`** | Playwright interactive UI debugger | **Yes** | Manual |
| **`npm run audit:pages`** | Page performance/payload audit only → `tests/reports/page-audit.{json,md}` | **Yes** (read-only) | ~2 min |
| **`npm run test:cleanup`** | Sweep orphaned `[TEST]` / `2099-W*` / `999xxx` rows left by crashed runs | **Yes** (deletes test rows) | ~10s |
| **`npm run test:timings`** | Run `npm test` (+ optional E2E), **save** timing baseline | Varies | ~1–4 min |
| **`npm run test:timings:check`** | Run tests and **fail** if slower than baseline × 1.5 | Varies | ~1–4 min |
| **`npm run test:all`** | `npm test` → `test:db` → `test:e2e` sequentially | **Yes** | ~3–5 min |

### What each tier tests

**`npm test` (no DB)**  
- Pure utilities (`formatMaterial`, cutover, rematch helpers, compliance, etc.)  
- **Router matrix** — every tRPC procedure in `tests/routers/procedure-manifest.ts` (mocked Prisma)  
- Targeted P0/P1 router tests (cutover, invoices, paystubs, …)  
- Component tests (Load cutover UI, Sidenav, GenericForm, …)  

**`npm run test:db` (dev MySQL)**  
- Cutover rematch, invoice/paystub lifecycle, sources admin  
- **`tests/db/pdf-generation.test.ts`** — invokes all 7 PDF API handlers against real data; asserts `%PDF` magic bytes, `application/pdf`, min size  
- Creates `[TEST]` / `999xxx` data; **`TestRunTracker`** deletes tracked rows in `afterAll`  

**`npm run test:e2e` (browser)**  
- Signs in once (`tests/e2e/auth.setup.ts`, default `admin` / `admin123$`)  
- Smoke: 26 routes load under auth middleware  
- Submit-flow checks, page timing budget, PDF endpoint HTTP smoke  
- **Invoice submit** (`invoice-submit.spec.ts`): seeds a `[TEST]` customer + weekly, creates an invoice through the UI, verifies DB linkage, cleans up  
- **Driver compliance** (`compliance-flows.spec.ts`): seeds a `[TEST]` W2 driver + form option; files/removes a form on `w2_forms`, checks `expiring-soon` CDL listing and `form-options` editing  
- **Page audit** (`page-audit.spec.ts`): per-route TTFB / time-to-content / SSR + tRPC payload sizes, written to `tests/reports/page-audit.{json,md}` (see the report for current hot spots)  

**tRPC timing middleware (dev/test only)**  
Every tRPC procedure call is timed via a middleware on the app router (`src/server/router/timing.ts`). Calls at or over `TRPC_SLOW_MS` (default 300 ms) log `[trpc slow] query loads.getAllPage 512ms` to the server console; the last 500 samples are kept in memory (`recentTrpcTimings()`). Compiled out of production behavior automatically; set `TRPC_TIMING=off` to silence it locally.

### Environment variables

Set in the shell (PowerShell examples) or in `.env` where noted.

| Variable | Where used | Purpose |
|----------|------------|---------|
| **`DATABASE_URL`** | `.env` (gitignored) | Dev MySQL connection. **Only** source for `test:db` / E2E. Never point at production. |
| **`TEST_DB_CONFIRMED=yes`** | `test:db` | Skip interactive DB confirm (repeat local runs). |
| **`PLAYWRIGHT_SKIP_DB_CONFIRM=yes`** | `test:e2e`, `test:timings` | Skip DB confirm in Playwright global setup. |
| **`PLAYWRIGHT_SKIP_SERVER=1`** | `test:e2e` | Do not start `next dev`; use already-running server on port 3000. |
| **`PLAYWRIGHT_BASE_URL`** | `test:e2e` | Default `http://localhost:3000`. |
| **`TRPC_SLOW_MS`** | dev server / tests | Threshold (ms) for `[trpc slow] …` console logs from the timing middleware (default 300). |
| **`TRPC_TIMING=off`** | dev server / tests | Disable the dev/test tRPC timing instrumentation (it is always off in production builds). |
| **`SOURCES_CUTOVER_FORCE=true`** | DB/E2E (auto in Playwright webServer) | Force Sources cutover paths during tests. |
| **`NEXT_PUBLIC_SOURCES_CUTOVER_FORCE=true`** | E2E webServer env | Client-side cutover UI. |
| **`TEST_TIMING_REGRESSION_FACTOR`** | `test:timings:check` | Max slowdown multiplier vs baseline (default `1.5`). |
| **`TEST_TIMING_MIN_MS`** | `test:timings:check` | Only flag per-test regressions when baseline duration ≥ this (default `50`). Suite totals always checked. |
| **`TEST_TIMINGS_INCLUDE_E2E=yes`** | `test:timings` | Also record Playwright durations when recording baseline. |
| **`TEST_TIMINGS=1`** | Playwright config | Write `tests/reports/playwright-results.json`. |
| **`E2E_PAGE_BUDGET_MS`** | `submit-flows.spec.ts` | Max ms for `/loads` to show form (default `12000`). |
| **`PDF_TEST_PORT`** | `test:db` global setup | Port for Next dev server during PDF tests (default `3001`). |
| **`PDF_TEST_BASE_URL`** | `tests/db/pdf-generation.test.ts` | Base URL for PDF HTTP fetches (set automatically by global setup). |
| **`PDF_TEST_SKIP_SERVER=yes`** | `test:db` | Reuse an already-running dev server on `PDF_TEST_PORT` instead of spawning one. |

### Suggested workflow

**Every code change**  
```bash
npm test
```

**Server/router/Prisma changes**  
```bash
npm test
TEST_DB_CONFIRMED=yes npm run test:db
```

**UI, routes, PDF, or auth changes**  
```bash
npm test
PLAYWRIGHT_SKIP_DB_CONFIRM=yes npm run test:e2e
```

**Before a large local release check**  
```bash
npm run test:coverage
TEST_DB_CONFIRMED=yes npm run test:db
PLAYWRIGHT_SKIP_DB_CONFIRM=yes npm run test:e2e
```

**After optimizing or worried about slowdowns**  
```bash
npm run test:timings          # refresh tests/baselines/timings.json
npm run test:timings:check    # fail if regressed vs baseline
```

**Full pre-release** (interactive DB confirm unless env vars set)  
```bash
npm run test:all
```

### DB safety

- Allowlist: `srv768.hstgr.io`, `localhost`, `127.0.0.1` (`tests/helpers/dbGuard.ts`)  
- Denylist: host/db names containing `prod`, `production`, `live`  
- Interactive confirm shows masked URL unless `TEST_DB_CONFIRMED=yes`  
- Test writes use ticket **`999001–999999`** and name prefix **`[TEST]`**  
- Cleanup deletes **tracked** rows only (not full DB rollback). If a run crashes mid-test, orphan `[TEST]` rows may remain — run **`npm run test:cleanup`** to sweep all orphaned test rows (`[TEST]` names, `2099-W*` weeks, `999xxx` tickets, `999800+` invoice numbers) in FK-safe order.
- Playwright runs a **global teardown** that deletes any loads left in the reserved `999001–999999` ticket range after E2E submit flows.

### Test layout

```
tests/
  GAPS.md         # Running list of coverage gaps (update as work progresses)
  unit/           # Pure functions (no DB)
  routers/        # Mocked tRPC + procedure-manifest matrix
  components/     # React Testing Library
  db/             # Dev MySQL + PDF handler integration
  e2e/            # Playwright
  helpers/        # dbGuard, trpcCaller, TestRunTracker, pdfHandlerRunner
  baselines/      # timings.json (committed baseline for regression checks)
  reports/        # Generated JSON timing/coverage output (gitignored)
```

### First-time setup

```bash
npm install
npx playwright install chromium
```

Ensure `.env` has your **dev** `DATABASE_URL`. Run `npm test` — should pass with no DB. For DB/E2E, confirm the prompt or set `TEST_DB_CONFIRMED=yes` / `PLAYWRIGHT_SKIP_DB_CONFIRM=yes`.

```bash
npm test
TEST_DB_CONFIRMED=yes npm run test:db
PLAYWRIGHT_SKIP_DB_CONFIRM=yes npm run test:e2e
```


### Vercel

We recommend deploying to [Vercel](https://vercel.com/?utm_source=t3-oss&utm_campaign=oss). It makes it super easy to deploy NextJs apps.

- Push your code to a GitHub repository.
- Go to [Vercel](https://vercel.com/?utm_source=t3-oss&utm_campaign=oss) and sign up with GitHub.
- Create a Project and import the repository you pushed your code to.
- Add your environment variables.
- Click **Deploy**
- Now whenever you push a change to your repository, Vercel will automatically redeploy your website!

### Docker

You can also dockerize this stack and deploy a container.

Please note that Next.js requires a different process for buildtime (available in the frontend, prefixed by `NEXT_PUBLIC`) and runtime environment, server-side only, variables. In this demo we are using two variables, `NEXT_PUBLIC_FOO` and `BAR`. Pay attention to their positions in the `Dockerfile`, command-line arguments, and `docker-compose.yml`.

1. In your [next.config.mjs](./next.config.mjs), add the `standalone` output-option to your config:

   ```diff
     export default defineNextConfig({
       reactStrictMode: true,
       swcMinify: true,
   +   output: "standalone",
     });
   ```

2. Remove the `env`-import from [next.config.mjs](./next.config.mjs):

   ```diff
   - import { env } from "./src/env/server.mjs";
   ```

3. Create a `.dockerignore` file with the following contents:
   <details>
   <summary>.dockerignore</summary>

   ```
   .env
   Dockerfile
   .dockerignore
   node_modules
   npm-debug.log
   README.md
   .next
   .git
   ```

  </details>

4. Create a `Dockerfile` with the following contents:
   <details>
   <summary>Dockerfile</summary>

   ```Dockerfile
   ########################
   #         DEPS         #
   ########################

   # Install dependencies only when needed
   # TODO: re-evaluate if emulation is still necessary on arm64 after moving to node 18
   FROM --platform=linux/amd64 node:16-alpine AS deps
   # Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
   RUN apk add --no-cache libc6-compat
   WORKDIR /app

   # Install dependencies based on the preferred package manager
   COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
   RUN \
     if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
     elif [ -f package-lock.json ]; then npm ci; \
     elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i; \
     else echo "Lockfile not found." && exit 1; \
     fi

   ########################
   #        BUILDER       #
   ########################

   # Rebuild the source code only when needed
   # TODO: re-evaluate if emulation is still necessary on arm64 after moving to node 18
   FROM --platform=linux/amd64 node:16-alpine AS builder

   ARG NEXT_PUBLIC_FOO
   ARG BAR

   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .

   # Next.js collects completely anonymous telemetry data about general usage.
   # Learn more here: https://nextjs.org/telemetry
   # Uncomment the following line in case you want to disable telemetry during the build.
   # ENV NEXT_TELEMETRY_DISABLED 1

   RUN \
     if [ -f yarn.lock ]; then yarn build; \
     elif [ -f package-lock.json ]; then npm run build; \
     elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm run build; \
     else echo "Lockfile not found." && exit 1; \
     fi

   ########################
   #        RUNNER        #
   ########################

   # Production image, copy all the files and run next
   # TODO: re-evaluate if emulation is still necessary after moving to node 18
   FROM --platform=linux/amd64 node:16-alpine AS runner
   # WORKDIR /usr/app
   WORKDIR /app

   ENV NODE_ENV production
   # Uncomment the following line in case you want to disable telemetry during runtime.
   # ENV NEXT_TELEMETRY_DISABLED 1

   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/next.config.mjs ./
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/package.json ./package.json

   # Automatically leverage output traces to reduce image size
   # https://nextjs.org/docs/advanced-features/output-file-tracing
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs

   EXPOSE 3000

   ENV PORT 3000

   CMD ["node", "server.js"]
   ```

  </details>

5. To build and run this image locally, run:

   ```bash
   docker build -t ct3a -e NEXT_PUBLIC_FOO=foo .
   docker run -p 3000:3000 -e BAR="bar" ct3a
   ```

6. You can also use a PaaS such as [Railway's](https://railway.app) automated [Dockerfile deployments](https://docs.railway.app/deploy/dockerfiles) to deploy your app.

### docker-compose

You can also use docker-compose to build and run the container.

1. Follow steps 1-4 above

2. Create a `docker-compose.yml` file with the following:

   <details>
   <summary>docker-compose.yml</summary>

   ```yaml
   version: "3.7"
   services:
     app:
       platform: "linux/amd64"
       build:
         context: .
         dockerfile: Dockerfile
         args:
           NEXT_PUBLIC_FOO: "foo"
       working_dir: /app
       ports:
         - "3000:3000"
       image: t3-app
       environment:
         - BAR=bar
   ```

   </details>

3. Run this using `docker-compose up`.

## Useful resources

Here are some resources that we commonly refer to:

- [Protecting routes with Next-Auth.js](https://next-auth.js.org/configuration/nextjs#unstable_getserversession)
