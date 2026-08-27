import { EmptyState } from "@/components/EmptyState";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex flex-col gap-4 pb-6">
      <h1 className="text-2xl font-semibold">Invoice</h1>
      <EmptyState
        title="Not available yet"
        body={`Invoice ${id} will open a review screen after OCR. Nothing is saved until you confirm.`}
        actionHref="/invoices"
        actionLabel="Back to sales"
      />
    </main>
  );
}
