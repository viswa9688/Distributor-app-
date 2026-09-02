import Link from "next/link";
import { notFound } from "next/navigation";
import { ManufacturerProducts } from "@/components/ManufacturerProducts";
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
          unit: true,
          currentBuyPrice: true,
        },
      },
    },
  });

  if (!manufacturer) notFound();

  const sampleProductId = manufacturer.products[0]?.id;
  const extraCharges = sampleProductId
    ? await prisma.productExtraCharge.findMany({
        where: { productId: sampleProductId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, amount: true, percent: true },
      })
    : [];

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

      <ManufacturerProducts
        manufacturerId={manufacturer.id}
        initialProducts={manufacturer.products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          currentBuyPrice: Number(p.currentBuyPrice),
        }))}
      />

      {extraCharges.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-slate-500">Extra charges</h2>
          <p className="text-xs text-slate-500">
            Stored on each product; shown here once per manufacturer. Updated when
            you apply a catalog.
          </p>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {extraCharges.map((charge) => (
              <li
                key={charge.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium">{charge.name}</span>
                <span className="text-sm text-slate-700">
                  {formatCharge(charge.amount, charge.percent)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
