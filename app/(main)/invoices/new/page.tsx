import { InvoiceCapture } from "@/components/InvoiceCapture";

export default function NewInvoicePage() {
  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Scan invoice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Camera first, gallery as a fallback. Invoices do not create products.
          Unmatched lines stay as text.
        </p>
      </div>
      <InvoiceCapture />
    </main>
  );
}
