import { EmptyState } from "@/components/EmptyState";

export default function ProductsPage() {
  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-1 text-sm text-slate-600">
          There is no add-product button. Catalogs create this list.
        </p>
      </div>
      <EmptyState
        title="No products yet"
        body="Upload a manufacturer catalog PDF. The first one creates every product. Later catalogs add new ones and update prices."
        actionHref="/catalogs/new"
        actionLabel="Upload a manufacturer catalog"
      />
    </main>
  );
}
