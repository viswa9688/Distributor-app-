import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function HomePage() {
  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="mt-1 text-sm text-slate-600">
          Start with a manufacturer catalog. That is how products get into the
          app. Invoices come after.
        </p>
      </div>

      <Link
        href="/catalogs/new"
        className="rounded-2xl bg-slate-900 px-4 py-4 text-white"
      >
        <p className="text-base font-semibold">Upload catalog</p>
        <p className="mt-1 text-sm text-slate-300">
          PDF from the manufacturer. This fills your product list.
        </p>
      </Link>

      <Link
        href="/invoices/new"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
      >
        <p className="text-base font-semibold">Scan invoice</p>
        <p className="mt-1 text-sm text-slate-600">
          Camera or gallery. Needs products from a catalog to match against.
        </p>
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-slate-500">Latest extra charges</h2>
        <EmptyState
          title="None yet"
          body="Extra charges come from the last page of a manufacturer catalog, after you apply one."
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">Recent sales</h2>
          <Link href="/invoices" className="text-sm text-slate-500 underline">
            All
          </Link>
        </div>
        <EmptyState
          title="No sales yet"
          body="Scan a retailer invoice after a catalog has been applied."
          actionHref="/invoices/new"
          actionLabel="Scan invoice"
        />
      </section>
    </main>
  );
}
