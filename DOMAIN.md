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
- Gemini `gemini-3.6-flash` for OCR (`gemini-2.0-flash` was retired by Google with a 404). Never auto-commit OCR; review screen first.
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

**Step 4 — Products UI (last-5 history)** is implemented. Waiting for user confirmation before starting step 5 (invoice OCR).

## What is built

Steps 1–3, plus:

- Database tables live on Supabase (`prisma migrate` applied). Storage buckets `catalogs` and `invoices`.
- Catalog PDF upload → Gemini `gemini-3.6-flash` → review → apply. Apply **appends** BUY history; never deletes it.
- Product list reads the real table (no add-product button).
- Product detail at `/products/[id]` shows name, SKU/unit, current buy price.
- Last 5 buy and last 5 sell are **read** queries: `ORDER BY recordedAt DESC LIMIT 5`. After a first catalog apply, buy has at least one row. Sell stays empty until invoices (step 5). That is correct.

Not built yet: invoice camera/OCR, dashboard polish.

## How to confirm this phase

1. Sign in → **Products**.
2. Open a product created by the catalog you applied.
3. You should see **Last 5 buy prices** with the catalog price (newest first). Not a stub.
4. **Last 5 sell prices** should still be empty (“come from invoices”).
5. Optional: apply a second catalog that updates the same SKU. Buy list should grow (up to 5); older rows remain in the database.

If that looks right, say so and we start **step 5 — invoice camera OCR**.
