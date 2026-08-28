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

**Step 2 — Product matcher** is implemented. Waiting for user confirmation before starting step 3 (catalog OCR).

## What is built

Step 1 (scaffold, auth, empty screens) plus:

- [`lib/product-match.ts`](lib/product-match.ts) — shared matcher for catalog rows and invoice lines.
  - Normalize (NFKC, lowercase, punctuation), extract size (`1kg` / `1 KG` / `500g`), drop filler words (`detergent`, `powder`, `pack`, …).
  - Size mismatch is a hard reject (`1kg` never attaches to `500g`).
  - Then SKU exact → normalized name exact → Dice + containment.
  - `HIGH` pre-selects (still editable later). `MEDIUM` returns top 3 and does **not** pre-select. `LOW`/`NONE` unmatched.
  - `catalogActionFor`: empty list / NONE / LOW → `CREATE`; HIGH → `UPDATE`; MEDIUM → `UNCERTAIN`.
- [`lib/product-match.test.ts`](lib/product-match.test.ts) — 10 tests. Run with `npm test`.
- No UI change. No database migration. Products are still empty until step 3.

Not built yet: catalog PDF OCR, products data UI, invoice camera/OCR, dashboard polish.

## How to confirm this phase

In the project folder:

```bash
npm test
```

All 10 tests should pass. That is the whole check for this step — there is nothing new to click in the browser.

Cases covered:

- `Surf Excel 1kg` → `Surf Excel Detergent 1KG` = HIGH
- `Surf Excel 1kg` vs `500g` = reject
- Two sizes of the same name never collapse
- `Tata Salt 1kg` vs `Tata Salt Iodized 1 KG` = HIGH or MEDIUM
- Blank/junk OCR = NONE
- Empty product list (first catalog) = CREATE
- SKU exact = HIGH; SKU + wrong size = reject

If that looks right, say so and we start **step 3 — catalog OCR**. That step needs a database migration and two Storage buckets; I will give you those clicks before writing the OCR code.
