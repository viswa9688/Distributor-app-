import { EmptyState } from "@/components/EmptyState";

export default function InvoicesPage() {
  return (
    <main className="flex flex-col gap-4 pb-6">
      <h1 className="text-2xl font-semibold">Sales</h1>
      <EmptyState
        title="No invoices yet"
        body="Point the camera at a retailer invoice after you have products from a catalog."
        actionHref="/invoices/new"
        actionLabel="Scan invoice"
      />
    </main>
  );
}
