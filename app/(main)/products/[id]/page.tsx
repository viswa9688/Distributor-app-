import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { ProductEditor } from "@/components/ProductEditor";
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

function sourceLabel(sourceType: string) {
  if (sourceType === "CATALOG") return "Catalog";
  if (sourceType === "INVOICE") return "Invoice";
  if (sourceType === "MANUAL") return "Manual";
  return sourceType;
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
                {sourceLabel(row.sourceType)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatCharge(
  amount: { toString(): string } | null,
  percent: { toString(): string } | null,
) {
  if (amount !== null) return Number(amount).toFixed(2);
  if (percent !== null) return `${Number(percent)}%`;
  return "—";
}

function ExtraChargesList({
  charges,
}: {
  charges: {
    id: string;
    name: string;
    amount: { toString(): string } | null;
    percent: { toString(): string } | null;
  }[];
}) {
  if (charges.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-slate-500">Extra charges</h2>
      <p className="text-xs text-slate-500">
        From the latest applied catalog for this manufacturer. Same on every
        product until a new catalog is applied.
      </p>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {charges.map((charge) => (
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
      extraCharges: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, amount: true, percent: true },
      },
    },
  });
  if (!product) notFound();

  const [buys, sells] = await Promise.all([
    lastFivePrices(product.id, "BUY"),
    lastFivePrices(product.id, "SELL"),
  ]);

  return (
    <main className="flex flex-col gap-6 pb-6">
      <ProductEditor
        productId={product.id}
        manufacturerId={product.manufacturer.id}
        manufacturerName={product.manufacturer.name}
        initialName={product.name}
        initialSku={product.sku}
        initialUnit={product.unit}
        initialBuyPrice={Number(product.currentBuyPrice)}
      />

      <ExtraChargesList charges={product.extraCharges} />

      <HistoryList
        title="Last 5 buy prices"
        emptyTitle="No buy prices yet"
        emptyBody="Buy prices are appended when you apply a catalog or edit the buy price manually. The full series stays in the database; this list only shows five."
        rows={buys}
      />
      <HistoryList
        title="Last 5 sell prices"
        emptyTitle="No sell prices yet"
        emptyBody="Sell prices come from retailer invoices. The full series is kept; this list only shows five."
        rows={sells}
      />
    </main>
  );
}
