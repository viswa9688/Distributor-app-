import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ manufacturer: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      currentBuyPrice: true,
      manufacturer: { select: { id: true, name: true } },
    },
  });

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-1 text-sm text-slate-600">
          All products across manufacturers. Invoice scan matches within the chosen manufacturer.
        </p>
      </div>
      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          body="Add a manufacturer and scan their catalog PDF. Products are grouped by supplier."
          actionHref="/manufacturers/new"
          actionLabel="Add manufacturer"
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <span>
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-slate-500">
                    {p.manufacturer.name}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </span>
                </span>
                <span className="text-sm text-slate-700">
                  {Number(p.currentBuyPrice)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
