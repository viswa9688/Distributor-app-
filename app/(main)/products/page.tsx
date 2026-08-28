import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      currentBuyPrice: true,
    },
  });

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-1 text-sm text-slate-600">
          There is no add-product button. Catalogs create this list.
        </p>
      </div>
      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          body="Upload a manufacturer catalog PDF. The first one creates every product. Later catalogs add new ones and update prices."
          actionHref="/catalogs/new"
          actionLabel="Upload a manufacturer catalog"
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/products/${p.id}`} className="flex items-center justify-between px-4 py-3">
                <span>
                  <span className="block text-sm font-medium">{p.name}</span>
                  {p.sku ? (
                    <span className="block text-xs text-slate-500">{p.sku}</span>
                  ) : null}
                </span>
                <span className="text-sm text-slate-700">{Number(p.currentBuyPrice)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
