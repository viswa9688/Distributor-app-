import Link from "next/link";
import { AddManufacturerForm } from "@/components/AddManufacturerForm";
import { ManufacturerFromCatalogUpload } from "@/components/ManufacturerFromCatalogUpload";

export default function NewManufacturerPage() {
  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <Link href="/manufacturers" className="text-sm text-slate-600 underline">
          Manufacturers
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add manufacturer</h1>
        <p className="mt-1 text-sm text-slate-600">
          Type a name, or upload a catalog PDF and confirm the suggested name.
        </p>
      </div>
      <AddManufacturerForm />
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-slate-500">From catalog PDF</h2>
        <ManufacturerFromCatalogUpload />
      </section>
    </main>
  );
}
