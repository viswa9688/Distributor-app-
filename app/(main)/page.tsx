import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

function formatCharge(amount: { toString(): string } | null, percent: { toString(): string } | null) {
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
    productCount,
    extraCharges,
    recentSales,
    catalogReviews,
    invoiceReviews,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.extraCharge.findMany({
      where: { catalogImport: { status: "APPLIED" } },
      orderBy: { catalogImport: { createdAt: "desc" } },
      take: 8,
      select: {
        id: true,
        name: true,
        amount: true,
        percent: true,
        catalogImportId: true,
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
      select: { id: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { status: "REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, retailerName: true },
    }),
  ]);

  const catalogFirst = productCount === 0;

  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="mt-1 text-sm text-slate-600">
          {catalogFirst
            ? "Start with a manufacturer catalog. That is how products get into the app. Invoices come after."
            : `${productCount} product${productCount === 1 ? "" : "s"} from catalogs. Scan invoices to record sales.`}
        </p>
      </div>

      {catalogFirst ? (
        <Link
          href="/catalogs/new"
          className="rounded-2xl bg-slate-900 px-4 py-4 text-white"
        >
          <p className="text-base font-semibold">Upload catalog</p>
          <p className="mt-1 text-sm text-slate-300">
            PDF from the manufacturer. The first one creates every product. There
            is no add-product button.
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
            href="/catalogs/new"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
          >
            <p className="text-base font-semibold">Upload another catalog</p>
            <p className="mt-1 text-sm text-slate-600">
              Adds new SKUs and appends buy prices. History is never deleted.
            </p>
          </Link>
        </div>
      )}

      {catalogFirst ? (
        <Link
          href="/invoices/new"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p className="text-base font-semibold">Scan invoice</p>
          <p className="mt-1 text-sm text-slate-600">
            Needs products from a catalog to match against. You can still scan;
            unmatched lines stay as text and do not write sell history.
          </p>
        </Link>
      ) : null}

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
                  <span>Catalog draft</span>
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
        {extraCharges.length === 0 ? (
          <EmptyState
            title="None yet"
            body="Extra charges come from a manufacturer catalog after you apply one. They can appear anywhere in the PDF, often on the last page."
            actionHref={catalogFirst ? "/catalogs/new" : undefined}
            actionLabel={catalogFirst ? "Upload a manufacturer catalog" : undefined}
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {extraCharges.map((charge) => (
              <li key={charge.id}>
                <Link
                  href={`/catalogs/${charge.catalogImportId}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm font-medium">{charge.name}</span>
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
              catalogFirst
                ? "Upload and apply a catalog first. Then scan a retailer invoice."
                : "Scan a retailer invoice and confirm. Unmatched lines do not write sell history."
            }
            actionHref={catalogFirst ? "/catalogs/new" : "/invoices/new"}
            actionLabel={catalogFirst ? "Upload a manufacturer catalog" : "Scan invoice"}
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
