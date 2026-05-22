# Northwind Eats — Restaurant Operations MVP

A production-ready back-office MVP for small-to-growing restaurant operators. Inspired by CLEARVIEW, scoped for the controllable levers that drive P&L: **food cost, labor cost, inventory variance, cash variance**.

## Deploy to the internet (no local setup needed)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgohil1128%2FGC-Workspace&env=AUTH_SECRET,AUTH_TRUST_HOST&envDescription=A%20random%2032%2B%20char%20string%20for%20AUTH_SECRET%2C%20and%20%22true%22%20for%20AUTH_TRUST_HOST&project-name=northwind-eats-ops&repository-name=northwind-eats-ops)

After Vercel imports the repo:
1. **Storage tab → Create Database → Neon** (one click; sets `DATABASE_URL` automatically)
2. **Settings → Environment Variables** — add:
   - `AUTH_SECRET` — any random 32+ character string (e.g. from https://generate-secret.vercel.app/32)
   - `AUTH_TRUST_HOST` — `true`
3. **Deployments tab → … menu → Redeploy** the latest. The build automatically runs Prisma migrations and loads demo data.
4. Open the deployment URL. Log in: `owner@demo.test` / `demo1234`

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Prisma 5** + **PostgreSQL 16**
- **Auth.js v5** (Credentials + bcrypt, JWT sessions)
- **Tailwind CSS** + **shadcn/ui-style** primitives (Radix)
- **Recharts** for dashboards · **Zod** for validation · **TanStack** primitives ready
- Modular monolith: feature code under `src/modules/<feature>/`

## Quick start

```bash
# 1) Install deps
pnpm install

# 2) Start Postgres (pick one)
docker compose up -d db          # via Docker
# or use a local Postgres 16 and edit DATABASE_URL in .env

# 3) Migrate + seed demo data
pnpm db:migrate
pnpm db:seed

# 4) Dev
pnpm dev
# → http://localhost:3000
```

**Demo logins** (password `demo1234` for both):
- `owner@demo.test` — full access incl. Settings
- `manager@demo.test` — operational access only

## Modules

| Module | Status | Pages |
|---|---|---|
| Auth | live | /login, /forgot-password (placeholder reset) |
| Dashboard | live | /dashboard |
| Inventory | live | /inventory, /inventory/[id], /inventory/counts, /inventory/variance |
| Recipes | live | /recipes, /recipes/[id] (BOM editor + live plate cost) |
| Purchasing | live | /purchasing, /purchasing/new (reorder builder), /purchasing/[id] (receive flow), /purchasing/suppliers |
| Labor | live | /labor (weekly grid), /labor/employees, /labor/report |
| Cash | live | /cash, /cash/new |
| Reports | live | /reports + CSV exports at /api/exports/[daily\|weekly\|labor\|variance\|spend\|cash] |
| Integrations | live (CSV import) / placeholder (POS, QB, payroll) | /settings/integrations |
| Settings | live | /settings, /settings/users |

## Folder structure

```
src/
├── app/                       # App Router pages
│   ├── (auth)/                # public auth pages
│   ├── (app)/                 # authenticated shell
│   └── api/                   # route handlers (auth, exports, imports)
├── components/
│   ├── ui/                    # shadcn-style primitives
│   ├── shell/                 # sidebar, topbar, location switcher
│   └── charts/                # KpiCard, TrendLine, BarSimple
├── modules/                   # feature modules
│   ├── auth/ dashboard/ inventory/ recipes/ purchasing/
│   ├── labor/ cash/ reports/
└── lib/                       # prisma, auth, scope, audit, money, date, csv
prisma/
├── schema.prisma
└── seed.ts                    # 45d sales, 32 ingredients, 10 recipes, 10 employees, 8 POs, etc.
```

## Product rules (enforced in code)

- **Every Server Action calls `getScope()` first** (`src/lib/scope.ts`). It resolves the active business + location from the JWT session and the location cookie, and is the only chokepoint that exposes tenant IDs.
- **Money** stored as integer cents (`*Cents`). All formatting flows through `src/lib/money.ts`.
- **Dashboard hero strip** = Net Sales · Food % · Labor % · Prime % · Inventory Variance %.
- **Inventory variance** = (theoretical − actual) valued at avg cost; >2% flagged.
- **Reorder suggestion** = top-up to par when on-hand ≤ reorder point, floored at reorderQty.
- **Receiving a PO** writes `InventoryMovement` rows, updates `onHand`, and recomputes weighted-average cost.
- **Cash over/short** = `closing + deposit − opening − expected`; |·| > $20 surfaces as an exception.
- **Every mutation writes an `AuditLog`** via `writeAudit()`.

## Architecture decisions

1. **Server Actions over REST.** Internal mutations are Server Actions inside `src/modules/<feature>/actions.ts`. `/api/*` is reserved for external boundaries (auth callbacks, CSV import/export).
2. **Modular monolith.** No microservices. Feature folders own queries, schemas, actions, and helpers. Cross-cutting code lives in `src/lib`.
3. **Edge-safe middleware.** Auth config is split: `auth.config.ts` (edge) carries session+callbacks, `auth.ts` (node) adds the credentials provider and bcrypt. Middleware imports only the config.
4. **Weighted-average costing** for the MVP. The schema records per-movement unit cost in `InventoryMovement` so FIFO can be layered on later without migration.
5. **Tenant scoping** via a single `getScope()` chokepoint. Every Server Action runs through it; nothing queries Prisma with raw client-supplied IDs.

## What's production-ready vs mocked

**Production-ready:**
- Prisma schema, migrations, weighted-avg costing
- Auth (credentials + bcrypt + JWT, role guards)
- All CRUD across all modules
- Dashboard math, variance math, reorder logic, PO receive → inventory movements
- Labor scheduling + scheduled-vs-actual + labor %
- Cash close + over/short + checklist
- CSV exports (6 reports) and sales CSV import
- Audit log on every mutation
- Dark/light + responsive shell + mobile nav

**Mocked / placeholder:**
- Password reset email (no transport configured)
- PDF export (endpoint at `/api/exports/pdf/[report]` returns 501 with the contract)
- POS sync (Square / Toast)
- QuickBooks export
- Payroll export
- Invoice OCR / upload (PO detail shows a disabled button)

## What to build next

1. **POS integration** (Square first — broadest SMB footprint) replacing manual/CSV sales.
2. **Real password reset** + email (Resend) + SSO via Auth.js providers.
3. **FIFO costing** layered on the existing `InventoryMovement` ledger.
4. **PDF reports** via Playwright or react-pdf — endpoint contract already wired.
5. **Forecasting model** for demand → labor scheduling assistant.
6. **Invoice OCR + 3-way match** (PO ↔ receipt ↔ invoice).
7. **Webhooks** for POs, exceptions, cash variance.
8. **Mobile companion** (Expo) for counts/receiving on the floor.

## Assumptions & limitations

- Single business per deployment (schema is multi-tenant but UI doesn't expose business switching).
- Manual sales entry + CSV only — no live POS integration in MVP.
- No real-time updates (no websockets / SSE).
- No fine-grained permissions beyond OWNER/MANAGER.
- Timezone is per-business; per-location TZ deferred to V2.
- Reports are server-rendered on demand; `ReportSnapshot` model exists for V2 caching.

## Useful commands

```bash
pnpm dev                 # start Next dev server
pnpm build && pnpm start # production build
pnpm typecheck           # tsc --noEmit
pnpm db:studio           # Prisma Studio
SEED_RESET=1 pnpm db:seed  # wipe + re-seed demo data
```

## Environment variables

See `.env.example`. Required:
- `DATABASE_URL` — Postgres connection string
- `AUTH_SECRET` — random 32+ char string for JWT signing
- `AUTH_TRUST_HOST=true` — required for Auth.js v5 in non-Vercel envs
