import { EmptyState } from "@/components/EmptyState";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex flex-col gap-4 pb-6">
      <h1 className="text-2xl font-semibold">Product</h1>
      <EmptyState
        title="Not available yet"
        body={`Product ${id} will show the last 5 buy and last 5 sell prices after catalogs and invoices land. The full history is kept; the page only shows five.`}
        actionHref="/products"
        actionLabel="Back to products"
      />
    </main>
  );
}
