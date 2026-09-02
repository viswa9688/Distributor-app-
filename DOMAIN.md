# DOMAIN.md

Read this file at the start of every Cursor session or phase, before planning or writing code.
Update this file only at **phase close**, as an explicit step. Do not append to it as a side effect of commits, refactors, or drive-by edits.

The file is `DOMAIN.md` (domain knowledge). There is no second `domain_knowledge.md`.

## What this business is

A distributor sits between a manufacturer and a retailer: buys from one, sells to the other. The app kills manual data entry around pricing and invoices by reading documents with OCR and keeping prices in sync.

Four jobs:

1. **Manufacturer catalogs (PDF)** — long multi-page docs. Somewhere in them is a price list; extra charges can appear anywhere, often on the last page. The app finds those pages, extracts prices, and updates the product database **for that manufacturer**.
2. **Retailer invoices** — handwritten or printed. Point the phone camera (or pick from gallery). Extract line items and prices; save as a sale.
3. **Price history** — for each product, a running record of buy prices (from the manufacturer) and sell prices (to the retailer). The UI shows the last 5 of each. The database keeps the full series.
4. **Sales quotes (Sell)** — browse all products, pick a **client**, set per-line margin % on top of buy cost + extra charges, save quote, export PDF.

## Product source of truth

The catalog pipeline is the primary way `Product` rows are created (plus manual add on manufacturer page).

- Every product belongs to one **Manufacturer**. Same SKU from two suppliers = two product rows.
- Catalog upload is always scoped to a manufacturer (`/manufacturers/[id]/catalogs/new`). Matcher only sees that manufacturer’s products.
- Invoices do **not** create products. Invoice scan requires choosing a **manufacturer**; matching uses only that supplier’s products.

## Clients and quotes

- **Client** table — retailers you send **outbound sales quotes** to (many clients; each has many quotes).
- Distinct from invoice `retailerName` (string on scanned retailer invoices). Linking Client ↔ invoice retailer is future work.
- **Sales quote** cost per unit = `currentBuyPrice` + product extra charges (flat amounts + % of buy price, not compounded).
- **Margin %** is per line; quote price = base cost × (1 + margin/100).
- Quotes are **snapshots** (client name, product fields, costs frozen at save time).
- PDF export only — quotes do **not** append SELL price history (that still comes from confirmed retailer invoices).

## Locked decisions

- One distributor org; staff share manufacturers, products, clients, quotes, and invoices.
- Next.js App Router (UI + Route Handlers). No separate backend.
- PostgreSQL via Supabase + Prisma. Supabase Auth. Supabase Storage (`invoices`, `catalogs`).
- Gemini `gemini-3.6-flash` for OCR. Never auto-commit OCR; review screen first.
- PWA via Serwist. Host: Vercel.
- **Manufacturer** is a table (name). **Client** is a table (name). Invoice **retailer** is still a string (known debt).
- Price history is **append-only**. “Last 5” is `ORDER BY recordedAt DESC LIMIT 5` on read.
- Catalog OCR is a **sync Route Handler**. `FAILED` + Retry re-runs the same handler; not a job queue.
- Product **extra charges** are stored per product (synced from applied catalog); same values across a manufacturer today.

## Matching rules (invoices + catalogs)

Same module. Size mismatch is a hard reject. SKU exact → normalized exact → Dice/containment.

Catalog matcher scope: **current manufacturer’s products only**. Invoice matcher scope: **selected manufacturer’s products only**.

## Build sequence (6 steps + post-v1)

v1 steps 1–6 complete. Post-v1:

7. **Manufacturers** — scoped catalog PDF; Home breakdown by manufacturer.
8. **Manufacturer-first sales** — invoice scan requires manufacturer; scoped matching.
9. **Product CRUD + catalog edit** — manual products; editable catalog review lines.
10. **Product-level extra charges** — synced from catalog apply.
11. **Sell + clients + quotes** — Sell tab, clients, saved quotes, time filters, PDF export.

## Current phase

**Sell (sales quotes)** is implemented. Waiting for user confirmation.

**Next step:** **Generate invoices** from saved sales quotes (turn a quote into a formal invoice document for the client — not yet built).

## What is built

- **Sell** tab: all products, search, manufacturer filter, client picker, per-line margin %, grand total.
- **Clients** (`/clients`): add client; each client has many quotes (`/clients/[id]` with time filter).
- **All quotes** (`/quotes`): filter by time (7d / 30d / 90d / all).
- Quote detail + **Download PDF** (`pdf-lib`).
- APIs: `POST/GET /api/clients`, `GET /api/sell/products`, `POST/GET /api/quotes`, `GET /api/quotes/[id]/pdf`.

## How to confirm this phase

1. Run `npx prisma migrate deploy` through `20260902200000_clients_and_sales_quotes`.
2. **Clients** → add “Shop ABC”.
3. **Sell** → pick Shop ABC → add products → set margins → **Save sales quote**.
4. **Clients → Shop ABC** → see quote; filter **Last 7 days**.
5. **Download PDF** — client name, lines, margins, grand total.
6. Confirm quote does **not** change SELL history until a retailer invoice is confirmed separately.

If that looks right, say so. **Next:** generate invoices from quotes.
