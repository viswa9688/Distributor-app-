import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ManufacturerFromCatalogUpload } from "@/components/ManufacturerFromCatalogUpload";
import { prisma } from "@/lib/prisma";

export default async function ManufacturersPage() {
  const manufacturers = await prisma.manufacturer.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <main className="flex flex-col gap-6 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Manufacturers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Each manufacturer has their own product list. Scan their catalog PDF inside their page.
          </p>
        </div>
        <Link
          href="/manufacturers/new"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Add
        </Link>
      </div>

      {manufacturers.length === 0 ? (
        <EmptyState
          title="No manufacturers yet"
          body="Add a manufacturer by name, or upload a catalog PDF and we will suggest a name from the file."
          actionHref="/manufacturers/new"
          actionLabel="Add by name"
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {manufacturers.map((m) => (
            <li key={m.id}>
              <Link
                href={`/manufacturers/${m.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium">{m.name}</span>
                <span className="text-sm text-slate-600">
                  {m._count.products} product{m._count.products === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-slate-500">Or add from catalog PDF</h2>
        <ManufacturerFromCatalogUpload />
      </section>
    </main>
  );
}
