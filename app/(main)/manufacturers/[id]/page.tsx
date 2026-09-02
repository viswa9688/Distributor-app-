import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";

function formatCharge(
  amount: { toString(): string } | null,
  percent: { toString(): string } | null,
) {
  if (amount !== null) return Number(amount).toFixed(2);
  if (percent !== null) return `${Number(percent)}%`;
  return "—";
}

export default async function ManufacturerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          sku: true,
          currentBuyPrice: true,
        },
      },
      catalogs: {
        where: { status: "APPLIED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          extraCharges: {
            select: { id: true, name: true, amount: true, percent: true },
          },
        },
      },
    },
  });

  if (!manufacturer) notFound();

  const extraCharges = manufacturer.catalogs.flatMap((c) =>
    c.extraCharges.map((charge) => ({
      ...charge,
      catalogId: c.id,
    })),
  );

  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <Link href="/manufacturers" className="text-sm text-slate-600 underline">
          Manufacturers
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{manufacturer.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {manufacturer.products.length} product
          {manufacturer.products.length === 1 ? "" : "s"} from this supplier.
        </p>
      </div>

      <Link
        href={`/manufacturers/${manufacturer.id}/catalogs/new`}
        className="rounded-2xl bg-slate-900 px-4 py-4 text-white"
      >
        <p className="text-base font-semibold">Scan catalog PDF</p>
        <p className="mt-1 text-sm text-slate-300">
          New products and price updates apply only to this manufacturer.
        </p>
      </Link>

      {manufacturer.products.length === 0 ? (
        <EmptyState
          title="No products yet"
          body="Scan a manufacturer catalog PDF. The first one creates every product for this supplier."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {manufacturer.products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <span>
                  <span className="block text-sm font-medium">{p.name}</span>
                  {p.sku ? (
                    <span className="block text-xs text-slate-500">{p.sku}</span>
                  ) : null}
                </span>
                <span className="text-sm text-slate-700">
                  {Number(p.currentBuyPrice)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {extraCharges.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-slate-500">Extra charges</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {extraCharges.map((charge) => (
              <li key={charge.id}>
                <Link
                  href={`/catalogs/${charge.catalogId}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm font-medium">{charge.name}</span>
                  <span className="text-sm text-slate-700">
                    {formatCharge(charge.amount, charge.percent)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
