import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      retailerName: true,
      status: true,
      createdAt: true,
      invoiceNumber: true,
    },
  });

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sales</h1>
          <p className="mt-1 text-sm text-slate-600">
            Confirmed invoices are sales. Review drafts before they count.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Scan
        </Link>
      </div>
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Point the camera at a retailer invoice after you have products from a catalog."
          actionHref="/invoices/new"
          actionLabel="Scan invoice"
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <span>
                  <span className="block text-sm font-medium">
                    {invoice.retailerName}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {invoice.invoiceNumber ? `#${invoice.invoiceNumber} · ` : ""}
                    {invoice.createdAt.toLocaleDateString()}
                  </span>
                </span>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {invoice.status === "CONFIRMED" ? "Sale" : "Review"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
