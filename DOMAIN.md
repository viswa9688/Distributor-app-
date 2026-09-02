# DOMAIN.md

Read this file at the start of every Cursor session or phase, before planning or writing code.
Update this file only at **phase close**, as an explicit step. Do not append to it as a side effect of commits, refactors, or drive-by edits.

The file is `DOMAIN.md` (domain knowledge). There is no second `domain_knowledge.md`.

## What this business is

A distributor sits between a manufacturer and a retailer: buys from one, sells to the other. The app kills manual data entry around pricing and invoices by reading documents with OCR and keeping prices in sync.

Three jobs:

1. **Manufacturer catalogs (PDF)** — long multi-page docs. Somewhere in them is a price list; extra charges can appear anywhere, often on the last page. The app finds those pages, extracts prices, and updates the product database **for that manufacturer**.
2. **Retailer invoices** — handwritten or printed. Point the phone camera (or pick from gallery). Extract line items and prices; save as a sale.
3. **Price history** — for each product, a running record of buy prices (from the manufacturer) and sell prices (to the retailer). The UI shows the last 5 of each. The database keeps the full series.

## Product source of truth

The catalog pipeline is the **only** way `Product` rows are created.

- Every product belongs to one **Manufacturer**. Same SKU from two suppliers = two product rows.
- Catalog upload is always scoped to a manufacturer (`/manufacturers/[id]/catalogs/new`). Matcher only sees that manufacturer’s products.
- Before the first catalog for a manufacturer, that manufacturer’s list is empty. That is correct.
- First catalog for a manufacturer: matcher vs empty scoped list → every row `CREATE`.
- Later catalogs for the same manufacturer: mix of `CREATE` / `UPDATE` / `UNCERTAIN`. Apply **appends** BUY history; never deletes history.
- No seed script. No “add product” admin form.
- Invoices do **not** create products. Invoice matching runs against **all** products (all manufacturers). Unmatched lines stay raw text; no `SELL` history until a `productId` is set.

## Locked decisions

- One distributor org; staff share the same manufacturers, products, and invoices.
- Next.js App Router (UI + Route Handlers). No separate backend.
- PostgreSQL via Supabase + Prisma. Supabase Auth. Supabase Storage (`invoices`, `catalogs`).
- Gemini `gemini-3.6-flash` for OCR. Never auto-commit OCR; review screen first.
- PWA via Serwist. Host: Vercel.
- **Manufacturer** is a table (name). **Retailer** is still a string on the invoice (known debt).
- Price history is **append-only**. “Last 5” is `ORDER BY recordedAt DESC LIMIT 5` on read.
- Catalog OCR is a **sync Route Handler**. `FAILED` + Retry re-runs the same handler; not a job queue.

## Matching rules (invoices + catalogs)

Same module. Size mismatch is a hard reject. SKU exact → normalized exact → Dice/containment.

Catalog matcher scope: **current manufacturer’s products only**. Invoice matcher scope: **all products**.

## Build sequence (6 steps + post-v1)

v1 steps 1–6 are complete. Post-v1:

7. **Manufacturers** — table + UI; scoped catalog PDF; Home breakdown by manufacturer.

## Current phase

**Manufacturers (post-v1)** is implemented. Waiting for user confirmation.

## What is built

v1 plus:

- `Manufacturer` model; `Product.manufacturerId` and `CatalogImport.manufacturerId` required.
- **Makers** tab: list, add by name, or add from catalog PDF (Gemini suggests name, user confirms).
- Manufacturer detail: product list, **Scan catalog PDF**, extra charges from applied catalogs.
- Home: manufacturer summary with product counts; extra charges show manufacturer name.
- Products list: manufacturer column; invoice scan still matches globally.
- Legacy `/catalogs/new` redirects to `/manufacturers`. Existing data backfilled to manufacturer `Imported catalog` if migration ran.

## How to confirm this phase

1. Run `npx prisma migrate deploy` (or `npm run db:migrate`) if the DB does not have `Manufacturer` yet.
2. Add manufacturer “ABC” → empty product list for ABC only.
3. Scan PDF inside ABC → Apply → products only under ABC.
4. Add “XYZ”, scan another PDF → separate rows even if names match ABC.
5. Home shows both with counts; Products list shows manufacturer column.
6. Invoice scan still matches products from any manufacturer.

If that looks right, say so. Next work is outside this sequence unless you request it.
