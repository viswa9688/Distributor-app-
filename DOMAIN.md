# DOMAIN.md

Read this file at the start of every Cursor session or phase, before planning or writing code.
Update this file only at **phase close**, as an explicit step. Do not append to it as a side effect of commits, refactors, or drive-by edits.

The file is `DOMAIN.md` (domain knowledge). There is no second `domain_knowledge.md`.

## What this business is

A distributor sits between a manufacturer and a retailer: buys from one, sells to the other. The app kills manual data entry around pricing and invoices by reading documents with OCR and keeping prices in sync.

Three jobs:

1. **Manufacturer catalogs (PDF)** — long multi-page docs. Somewhere in them is a price list; the last page usually has extra charges. The app finds those pages, extracts prices, and updates the product database.
2. **Retailer invoices** — handwritten or printed. Point the phone camera (or pick from gallery). Extract line items and prices; save as a sale.
3. **Price history** — for each product, a running record of buy prices (from the manufacturer) and sell prices (to the retailer). The UI shows the last 5 of each. The database keeps the full series.

## Product source of truth

The catalog pipeline is the **only** way `Product` rows are created in v1.

- Before the first catalog is applied, the product table is empty. That is correct, not a bug.
- First catalog: matcher vs empty table → every row `CREATE` → insert products + first `BUY` history each. Review copy is “N new products”, not a matching failure.
- Later catalogs: mix of `CREATE` (new manufacturer SKUs) and `UPDATE` (existing products). Apply appends another `BUY` observation even if the price is unchanged. User can `SKIP` a row.
- No seed script. No “add product” admin form.
- Invoices do **not** create products. Unmatched invoice lines stay raw text; no `SELL` history until a `productId` is set.

## Locked v1 decisions

- One distributor org; staff share the same products/invoices.
- Next.js App Router (UI + Route Handlers). No separate backend.
- PostgreSQL via Supabase + Prisma. Supabase Auth. Supabase Storage (`invoices`, `catalogs`).
- Gemini `gemini-2.0-flash` for OCR. Never auto-commit OCR; review screen first.
- PWA via Serwist (not `next-pwa`).
- Host: Vercel.
- Retailer is a **string** on the invoice, not a table (known debt).
- Price history is **append-only**. “Last 5” is `ORDER BY recordedAt DESC LIMIT 5` on read. Never delete history on apply.
- Catalog OCR in v1 is a **sync Route Handler**. Large PDFs will hit the Vercel timeout. `FAILED` + Retry re-runs the same handler; that is a retry button, not a job queue.

## Matching rules (invoices + catalogs)

Same module for both. Normalize names, canonicalize units, extract size. Size mismatch is a hard reject (`1kg` must not match `500g`). Then SKU exact → normalized exact → Dice/containment score.

Confidence: `HIGH` pre-selects (still editable), `MEDIUM` shows top 3 and does not pre-select, `LOW`/`NONE` requires a picker. Empty product list → catalog assigns `CREATE`, invoice assigns `NONE`.

## Build sequence (6 steps)

Confirm with the user after each step that the app behaves as intended. Do not start the next step until they say so.

1. **Scaffold** — Next.js, Prisma schema, Supabase auth/middleware, PWA shell, empty screens, git in this folder.
2. **Product matcher** — pure module + tests (including empty catalog → all CREATE).
3. **Catalog OCR** — PDF → extract → review → apply. This fills `Product`.
4. **Products UI** — list/detail, last-5 via LIMIT, empty state until step 3.
5. **Invoice OCR** — camera → extract → match → confirm sale + SELL history.
6. **Dashboard polish + verify** — catalog-first empty state, extra charges, end-to-end check.

## Current phase

**Step 1 — Scaffold** is implemented. Waiting for user confirmation before starting step 2 (product matcher).

## What is built

- Next.js 16 App Router (TypeScript, Tailwind 4) in this folder. Package name is `distributor-app` because npm cannot use the space in the folder name.
- Git repo initialized **in this folder** (do not use the home-directory git repo).
- Prisma schema for Product, PriceHistory (append-only), Invoice, InvoiceLine, CatalogImport, CatalogLine, ExtraCharge. No migration has been applied yet — that needs a real Supabase Postgres URL.
- Supabase Auth wiring: cookie session, middleware, `/login`, `/auth/callback`. Signup gated by `ALLOW_SIGNUP` (default on).
- Without `.env`, screens still load and show a setup banner. Login form appears only after Supabase env vars exist.
- PWA shell: web manifest, icons, Serwist (`@serwist/next`). Service worker is **disabled in `next dev`**. Production uses `next build --webpack` because Serwist is webpack-based; Next 16 defaults to Turbopack.
- Empty mobile screens with bottom nav (Home / Scan / Products):
  - `/` catalog-first dashboard, empty extra charges, empty recent sales
  - `/products` empty state: upload a catalog (no add-product button)
  - `/invoices` empty sales list
  - `/catalogs/new` and `/invoices/new` are placeholders for later steps
- `DOMAIN.md` + `.cursor/rules/domain.mdc`: read this file at session start; update it only at phase close.

Not built yet: matcher, catalog PDF OCR, products data UI, invoice camera/OCR, dashboard polish.

## How to confirm this phase

Dev server: `npm run dev` → http://localhost:3000 (already started for this session).

Check without Supabase keys:

1. Home shows “Upload catalog” as the primary action and empty extra charges / sales.
2. Products says “No products yet” and has no add-product button.
3. Bottom nav: Home, Scan, Products.
4. `/login` explains how to add `.env` (no email form until keys exist).
5. Catalog upload and Scan invoice pages admit they are later steps.

Check with Supabase (optional for this step, required before catalog/invoice work):

1. Copy `.env.example` to `.env`, paste URL + anon key + Postgres URLs.
2. Restart `npm run dev`.
3. Sign up / sign in, then you should land on Home. Sign out returns to login.
4. Do **not** run `prisma migrate` until you are ready to use the database (step 3). Schema is in the repo; the live DB is still empty.

If this matches what you wanted, say so and we start **step 2 — product matcher**.
