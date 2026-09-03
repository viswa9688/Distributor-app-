# DOMAIN.md

Read this file at the start of every Cursor session or phase, before planning or writing code.
When a build step or feature is **finished**, update this file in the same turn — do not wait for the user to confirm first. Do not append as a silent side effect of unrelated commits or refactors.

The file is `DOMAIN.md` (domain knowledge). There is no second `domain_knowledge.md`.

## What this business is

A distributor sits between a manufacturer and a retailer: buys from one, sells to the other. The app kills manual data entry around pricing and invoices by reading documents with OCR and keeping prices in sync.

Five jobs:

1. **Manufacturer catalogs (PDF)** — long multi-page docs. Somewhere in them is a price list; extra charges can appear anywhere, often on the last page. The app finds those pages, extracts prices, and updates the product database **for that manufacturer**.
2. **Retailer invoices** — handwritten or printed. Point the phone camera (or pick from gallery). Extract line items and prices; save as a sale.
3. **Price history** — for each product, a running record of buy prices (from the manufacturer) and sell prices (to the retailer). The UI shows the last 5 of each. The database keeps the full series.
4. **Sales quotes (Sell)** — browse all products, pick a **client**, add quantities; quote shows **total cost** per unit (buy + extra charges) and line total (unit cost × qty).
5. **Rate lookup** — search a product and see list rate, KPI strip, last-5 purchase updates (catalog/PDF), and last-5 sells (invoices), with mock fill where real data is missing.

## Product source of truth

The catalog pipeline is the primary way `Product` rows are created (plus manual add on manufacturer page).

- Every product belongs to one **Manufacturer**. Same SKU from two suppliers = two product rows.
- Catalog upload is always scoped to a manufacturer (`/manufacturers/[id]/catalogs/new`). Matcher only sees that manufacturer’s products.
- Invoices do **not** create products. Invoice scan requires choosing a **manufacturer**; matching uses only that supplier’s products.

## Clients and quotes

- **Client** table — retailers you send **outbound sales quotes** to (many clients; each has many quotes).
- **Clients** bottom-nav tab (`/clients`) lists all clients; tap one → `/clients/[id]` shows **all quotes for that client** (default filter: all time; optional 7d / 30d / 90d).
- Distinct from invoice `retailerName` (string on scanned retailer invoices). Linking Client ↔ invoice retailer is future work.
- Each saved **SalesQuote** stores `createdAt` (UTC in DB). UI and PDF show **date created** and **time created** separately (locale-aware).
- **Sales quote** (client-facing): each line shows **total charges** only (line total). No unit cost, base cost, or margin on quote detail or PDF. Distributor sees product cost only while building in Sell.
- Quotes are **snapshots** (client name, product fields, costs frozen at save time).
- PDF export only — quotes do **not** append SELL price history (that still comes from confirmed retailer invoices).

## Rate tab

- Bottom-nav **Rate** → `/rate` ([`components/RateLookup.tsx`](components/RateLookup.tsx)).
- Search by product name/SKU; pick one → dashboard.
- **Hero rate** = `Product.currentBuyPrice` (from last applied catalog / buy history). Real — no mock label.
- **KPI strip:** Sales 6M qty, Purchase 1M qty, Closing stock qty/amount are **mock** until inventory exists; Purchase rate/unit is **real**.
- **PURCHASE** table = last 5 `PriceHistory` BUY (catalog/PDF updates). Date, rate, manufacturer party are real; qty / disc % / amount mock when not stored.
- **SALES** table = last 5 `PriceHistory` SELL, enriched from confirmed invoices (party, qty, amount when join works). Disc % mock; pad to 5 rows with mock if fewer sells.
- Mock values show `(mock)` beside the value. Real values have no mock suffix and no brackets around the number.
- APIs: `GET /api/rate/products?q=`, `GET /api/rate/products/[id]` via [`lib/rate-view.ts`](lib/rate-view.ts). Still uses `lastFivePrices` LIMIT 5 (append-only history).

## OCR providers

- App shell switch: **Gemini** | **Open source** ([`components/OcrProviderSwitch.tsx`](components/OcrProviderSwitch.tsx)).
- Cookie `ocr_provider`; router [`lib/ocr.ts`](lib/ocr.ts). Open source enabled only when `OCR_WORKER_URL` is set and worker `/health` is OK.
- Open-source worker lives in [`services/ocr-worker/`](services/ocr-worker/) (Paddle + optional VLM). Not required for Gemini-only demos.

## Locked decisions

- One distributor org; staff share manufacturers, products, clients, quotes, and invoices.
- Next.js App Router (UI + Route Handlers). No separate backend.
- PostgreSQL via Supabase + Prisma. Supabase Auth. Supabase Storage (`invoices`, `catalogs`).
- Gemini `gemini-3.6-flash` for OCR by default. Never auto-commit OCR; review screen first.
- PWA via Serwist. Host: Vercel.
- **Manufacturer** is a table (name). **Client** is a table (name). Invoice **retailer** is still a string (known debt).
- Price history is **append-only**. “Last 5” is `ORDER BY recordedAt DESC LIMIT 5` on read.
- Catalog OCR is a **sync Route Handler**. `FAILED` + Retry re-runs the same handler; not a job queue.
- Product **extra charges** are stored per product (synced from applied catalog); same values across a manufacturer today.
- Bottom nav: Home | Makers | Sell | **Rate** | Clients | Scan | Products.

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
12. **Clients nav + quote timestamps** — dedicated Clients tab; date/time on every quote list, detail, and PDF.
13. **Rate tab** — product rate dashboard with real buy/sell history + mock fill for missing fields.
14. **OCR provider switch + ocr-worker** — Gemini vs open-source extract path (worker optional).

## Current phase

**Rate tab** is implemented and documented.

**Next step:** **Generate invoices** from saved sales quotes (formal invoice document for the client — not yet built).

## What is built

- **Sell** tab: product browse, client picker, quantity; unit cost + line total + grand total.
- **Clients** tab: list clients → client detail with **all quotes** for that client; date + time on each row.
- Quote detail: **Date created** / **Time created**; PDF includes both.
- **Rate** tab: search product → KPIs, list rate, last-5 purchase, last-5 sales (real + mock labels).
- OCR provider switch in app shell; catalog/invoice extract routed via [`lib/ocr.ts`](lib/ocr.ts).
- `/quotes`: all quotes across clients (optional; also reachable from Clients flow).
- Rate APIs: `GET /api/rate/products`, `GET /api/rate/products/[id]`.

## How to confirm this phase

1. Bottom nav shows **Rate** between Sell and Clients.
2. Rate → search a catalog product → hero rate matches buy price with no `(mock)`.
3. PURCHASE has at least one real rate/date/party row; invented qty/disc/amount show `(mock)`.
4. SALES pads to five; real invoice sells unlabeled; padded rows show `(mock)`.
5. Mock KPI cards show `(mock)`.

**Next:** generate invoices from quotes.
