import { EmptyState } from "@/components/EmptyState";

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex flex-col gap-4 pb-6">
      <h1 className="text-2xl font-semibold">Catalog review</h1>
      <EmptyState
        title="Not available yet"
        body={`Catalog ${id} will group rows as new products vs price updates. The first catalog should look like “N new products”, not a matching failure.`}
        actionHref="/"
        actionLabel="Back home"
      />
    </main>
  );
}
