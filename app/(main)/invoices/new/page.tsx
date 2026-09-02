import { EmptyState } from "@/components/EmptyState";
import { InvoiceCapture } from "@/components/InvoiceCapture";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage() {
  const productCount = await prisma.product.count();

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Scan invoice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Camera first, gallery as a fallback. Invoices do not create products.
          Unmatched lines stay as text.
        </p>
      </div>
      {productCount === 0 ? (
        <EmptyState
          title="Catalog first"
          body="There are no products yet. Upload a manufacturer catalog so invoice lines can match. You can still scan; unmatched lines will not write sell history."
          actionHref="/manufacturers/new"
          actionLabel="Upload a manufacturer catalog"
        />
      ) : null}
      <InvoiceCapture />
    </main>
  );
}
