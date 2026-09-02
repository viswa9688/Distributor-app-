import Link from "next/link";
import { InvoiceReview } from "@/components/InvoiceReview";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      manufacturer: { select: { id: true, name: true } },
      lines: { orderBy: { rawDescription: "asc" } },
    },
  });

  if (!invoice) {
    return (
      <main className="flex flex-col gap-4 pb-6">
        <h1 className="text-2xl font-semibold">Invoice</h1>
        <EmptyState
          title="Invoice not found"
          body="That sale does not exist."
          actionHref="/invoices"
          actionLabel="Back to sales"
        />
      </main>
    );
  }

  const products = await prisma.product.findMany({
    where: { manufacturerId: invoice.manufacturerId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true },
  });

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <Link href="/invoices" className="text-sm text-slate-600 underline">
          Sales
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {invoice.status === "CONFIRMED" ? "Sale" : "Invoice review"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Selling from{" "}
          <Link
            href={`/manufacturers/${invoice.manufacturer.id}`}
            className="underline"
          >
            {invoice.manufacturer.name}
          </Link>
        </p>
        {invoice.invoiceNumber ? (
          <p className="mt-1 text-sm text-slate-600">#{invoice.invoiceNumber}</p>
        ) : null}
      </div>
      <InvoiceReview
        invoiceId={invoice.id}
        initialStatus={invoice.status}
        initialRetailer={invoice.retailerName}
        manufacturerName={invoice.manufacturer.name}
        products={products}
        initialLines={invoice.lines.map((line) => ({
          id: line.id,
          rawDescription: line.rawDescription,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
          productId: line.productId,
          matchConfidence: line.matchConfidence,
          matchCandidates: Array.isArray(line.matchCandidates)
            ? (line.matchCandidates as {
                productId: string;
                name: string;
                score: number;
              }[])
            : null,
        }))}
      />
    </main>
  );
}
