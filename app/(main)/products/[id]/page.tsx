import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { lastFivePrices } from "@/lib/price-history";
import { prisma } from "@/lib/prisma";

function formatPrice(value: { toString(): string } | number) {
  return Number(value).toFixed(2);
}

function formatWhen(date: Date) {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function HistoryList({
  title,
  emptyTitle,
  emptyBody,
  rows,
}: {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  rows: { id: string; price: { toString(): string }; recordedAt: Date; sourceType: string }[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-slate-500">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between px-4 py-3">
              <span>
                <span className="block text-sm font-medium">{formatPrice(row.price)}</span>
                <span className="block text-xs text-slate-500">{formatWhen(row.recordedAt)}</span>
              </span>
              <span className="text-xs uppercase tracking-wide text-slate-500">
                {row.sourceType === "CATALOG" ? "Catalog" : "Invoice"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      currentBuyPrice: true,
      manufacturer: { select: { id: true, name: true } },
    },
  });
  if (!product) notFound();

  const [buys, sells] = await Promise.all([
    lastFivePrices(product.id, "BUY"),
    lastFivePrices(product.id, "SELL"),
  ]);

  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <Link href="/products" className="text-sm text-slate-600 underline">
          Products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          <Link
            href={`/manufacturers/${product.manufacturer.id}`}
            className="underline"
          >
            {product.manufacturer.name}
          </Link>
          {product.sku ? ` · ${product.sku}` : " · No SKU"}
          {product.unit ? ` · ${product.unit}` : ""}
        </p>
        <p className="mt-2 text-base font-medium">
          Current buy {formatPrice(product.currentBuyPrice)}
        </p>
      </div>

      <HistoryList
        title="Last 5 buy prices"
        emptyTitle="No buy prices yet"
        emptyBody="Buy prices are appended when you apply a manufacturer catalog. The full series stays in the database; this list only shows five."
        rows={buys}
      />
      <HistoryList
        title="Last 5 sell prices"
        emptyTitle="No sell prices yet"
        emptyBody="Sell prices come from retailer invoices. That is the next step. The full series is kept; this list only shows five."
        rows={sells}
      />
    </main>
  );
}
