import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

function formatCharge(
  amount: { toString(): string } | null,
  percent: { toString(): string } | null,
) {
  if (amount !== null) return Number(amount).toFixed(2);
  if (percent !== null) return `${Number(percent)}%`;
  return "—";
}

export default async function HomePage() {
  if (!isSupabaseConfigured() || !isDatabaseConfigured()) {
    return (
      <main className="flex flex-col gap-4 pb-6">
        <h1 className="text-2xl font-semibold">Home</h1>
        <EmptyState
          title="App is not configured on this host"
          body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL, DIRECT_URL, and GEMINI_API_KEY in the host’s environment, then redeploy."
          actionHref="/login"
          actionLabel="Open sign in"
        />
      </main>
    );
  }

  const [
    manufacturers,
    productCount,
    extraCharges,
    recentSales,
    catalogReviews,
    invoiceReviews,
  ] = await Promise.all([
    prisma.manufacturer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.product.count(),
    prisma.productExtraCharge.findMany({
      orderBy: { id: "desc" },
      take: 40,
      select: {
        id: true,
        name: true,
        amount: true,
        percent: true,
        product: {
          select: {
            manufacturer: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { status: "CONFIRMED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        retailerName: true,
        invoiceNumber: true,
        createdAt: true,
      },
    }),
    prisma.catalogImport.findMany({
      where: { status: "REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        manufacturer: { select: { name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { status: "REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, retailerName: true },
    }),
  ]);

  const latestExtraCharges: typeof extraCharges = [];
  const seenChargeKeys = new Set<string>();
  for (const charge of extraCharges) {
    const key = `${charge.product.manufacturer.id}:${charge.name}`;
    if (seenChargeKeys.has(key)) continue;
    seenChargeKeys.add(key);
    latestExtraCharges.push(charge);
    if (latestExtraCharges.length >= 8) break;
  }

  const noManufacturers = manufacturers.length === 0;
  const noProducts = productCount === 0;

  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="mt-1 text-sm text-slate-600">
          {noManufacturers
            ? "Add a manufacturer, then scan their catalog PDF. Products stay grouped by supplier."
            : noProducts
              ? `${manufacturers.length} manufacturer${manufacturers.length === 1 ? "" : "s"} — scan a catalog PDF to add products.`
              : `${productCount} product${productCount === 1 ? "" : "s"} across ${manufacturers.length} manufacturer${manufacturers.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">Manufacturers</h2>
          <Link href="/manufacturers" className="text-sm text-slate-500 underline">
            All
          </Link>
        </div>
        {manufacturers.length === 0 ? (
          <EmptyState
            title="No manufacturers yet"
            body="Add who you buy from. Each one gets their own product list and catalog PDFs."
            actionHref="/manufacturers/new"
            actionLabel="Add manufacturer"
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {manufacturers.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/manufacturers/${m.id}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="text-sm text-slate-600">
                    {m._count.products} product{m._count.products === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {noManufacturers ? (
        <Link
          href="/manufacturers/new"
          className="rounded-2xl bg-slate-900 px-4 py-4 text-white"
        >
          <p className="text-base font-semibold">Add manufacturer</p>
          <p className="mt-1 text-sm text-slate-300">
            Then scan their catalog PDF inside their page.
          </p>
        </Link>
      ) : noProducts ? (
        <Link
          href="/manufacturers"
          className="rounded-2xl bg-slate-900 px-4 py-4 text-white"
        >
          <p className="text-base font-semibold">Scan a catalog PDF</p>
          <p className="mt-1 text-sm text-slate-300">
            Open a manufacturer and upload their price list before scanning invoices.
          </p>
        </Link>
      ) : (
        <div className="grid gap-3">
          <Link
            href="/invoices/new"
            className="rounded-2xl bg-slate-900 px-4 py-4 text-white"
          >
            <p className="text-base font-semibold">Scan invoice</p>
            <p className="mt-1 text-sm text-slate-300">
              Camera or gallery. Confirm before it becomes a sale.
            </p>
          </Link>
          <Link
            href="/manufacturers"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
          >
            <p className="text-base font-semibold">Manufacturers</p>
            <p className="mt-1 text-sm text-slate-600">
              Scan another catalog PDF for a specific supplier.
            </p>
          </Link>
        </div>
      )}

      {catalogReviews.length > 0 || invoiceReviews.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-slate-500">Waiting on review</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {catalogReviews.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/catalogs/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span>
                    {c.manufacturer.name}
                    <span className="block text-xs text-slate-500">Catalog draft</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {c.createdAt.toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
            {invoiceReviews.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span>{inv.retailerName}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Invoice
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-slate-500">Latest extra charges</h2>
        {latestExtraCharges.length === 0 ? (
          <EmptyState
            title="None yet"
            body="Extra charges come from an applied manufacturer catalog and are stored on each product."
            actionHref={noManufacturers ? "/manufacturers/new" : undefined}
            actionLabel={noManufacturers ? "Add manufacturer" : undefined}
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {latestExtraCharges.map((charge) => (
              <li key={charge.id}>
                <Link
                  href={`/manufacturers/${charge.product.manufacturer.id}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span>
                    <span className="block text-sm font-medium">{charge.name}</span>
                    <span className="block text-xs text-slate-500">
                      {charge.product.manufacturer.name}
                    </span>
                  </span>
                  <span className="text-sm text-slate-700">
                    {formatCharge(charge.amount, charge.percent)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">Recent sales</h2>
          <Link href="/invoices" className="text-sm text-slate-500 underline">
            All
          </Link>
        </div>
        {recentSales.length === 0 ? (
          <EmptyState
            title="No sales yet"
            body={
              noManufacturers || noProducts
                ? "Add a manufacturer and catalog first. Then scan a retailer invoice."
                : "Scan a retailer invoice and confirm."
            }
            actionHref={
              noManufacturers
                ? "/manufacturers/new"
                : noProducts
                  ? "/manufacturers"
                  : "/invoices/new"
            }
            actionLabel={
              noManufacturers
                ? "Add manufacturer"
                : noProducts
                  ? "Scan catalog PDF"
                  : "Scan invoice"
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {recentSales.map((sale) => (
              <li key={sale.id}>
                <Link
                  href={`/invoices/${sale.id}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span>
                    <span className="block text-sm font-medium">
                      {sale.retailerName}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {sale.invoiceNumber ? `#${sale.invoiceNumber} · ` : ""}
                      {sale.createdAt.toLocaleDateString()}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
