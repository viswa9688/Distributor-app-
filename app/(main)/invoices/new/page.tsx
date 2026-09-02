import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { InvoiceCapture } from "@/components/InvoiceCapture";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage() {
  const manufacturers = await prisma.manufacturer.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { products: true } },
    },
  });

  const manufacturerOptions = manufacturers.map((m) => ({
    id: m.id,
    name: m.name,
    productCount: m._count.products,
  }));

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Scan invoice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Select which manufacturer you are selling from, then photograph the
          retailer invoice. Lines match only that supplier&apos;s products.
        </p>
      </div>
      {manufacturers.length === 0 ? (
        <EmptyState
          title="Add a manufacturer first"
          body="Create a manufacturer and scan their catalog PDF before you can record sales."
          actionHref="/manufacturers/new"
          actionLabel="Add manufacturer"
        />
      ) : (
        <InvoiceCapture manufacturers={manufacturerOptions} />
      )}
    </main>
  );
}
