import Link from "next/link";
import { notFound } from "next/navigation";
import { formatQuoteDate, formatQuoteTime } from "@/lib/format-datetime";
import { prisma } from "@/lib/prisma";
import { sumQuoteLines } from "@/lib/quote";

function formatMoney(n: number) {
  return n.toFixed(2);
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.salesQuote.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      lines: { orderBy: { productName: "asc" } },
    },
  });
  if (!quote) notFound();

  const lines = quote.lines.map((l) => ({
    id: l.id,
    productName: l.productName,
    manufacturerName: l.manufacturerName,
    sku: l.sku,
    unit: l.unit,
    quantity: Number(l.quantity),
    lineTotal: Number(l.lineTotal),
  }));
  const grandTotal = sumQuoteLines(lines);

  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <Link href={`/clients/${quote.client.id}`} className="text-sm text-slate-600 underline">
          {quote.clientName}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Sales quote</h1>
        <dl className="mt-2 space-y-1 text-sm text-slate-600">
          <div className="flex gap-2">
            <dt className="text-slate-500">Date created</dt>
            <dd>{formatQuoteDate(quote.createdAt)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">Time created</dt>
            <dd>{formatQuoteTime(quote.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <a
        href={`/api/quotes/${quote.id}/pdf`}
        className="rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
      >
        Download PDF
      </a>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {lines.map((line) => (
          <li key={line.id} className="px-4 py-3">
            <p className="text-sm font-medium">{line.productName}</p>
            <p className="text-xs text-slate-500">
              {line.manufacturerName}
              {line.sku ? ` · ${line.sku}` : ""}
              {line.unit ? ` · ${line.unit}` : ""}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              Total {formatMoney(line.lineTotal)}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-base font-semibold">
        Grand total: {formatMoney(grandTotal)}
      </p>
    </main>
  );
}
