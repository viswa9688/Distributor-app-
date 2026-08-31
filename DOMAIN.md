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

**Step 5 — Invoice OCR** is implemented. Waiting for user confirmation before starting step 6 (dashboard polish).

## What is built

Steps 1–4, plus:

- Scan at `/invoices/new`: rear camera, gallery fallback. Photo goes to Storage `invoices`.
- Gemini `gemini-3.6-flash` extracts retailer (string), optional number/date, and line items. Review at `/invoices/[id]` before anything is a sale.
- Same matcher as catalogs. HIGH pre-selects. MEDIUM shows top 3, no pre-select. LOW/NONE need a picker. Empty product list → all unmatched (`NONE`). Invoices **never** create products.
- Confirm appends `SELL` history only for lines with a `productId`. Unmatched lines stay raw text. History is never deleted. Last-5 on the product page is still a read `LIMIT 5`.

Not built yet: dashboard polish (home extra charges / recent sales).

## How to confirm this phase

1. Have products from an applied catalog.
2. Sign in → **Scan** (or Home → Scan invoice).
3. Take a photo or pick from gallery. Wait for review.
4. Fix retailer name if needed. HIGH rows should be pre-selected. Leave junk unmatched.
5. **Confirm sale**. **Sales** should list it. Open a matched product: **Last 5 sell** should show that unit price.

If OCR finds no lines, stay on Scan with an error and try a clearer photo (no invoice row is created).
