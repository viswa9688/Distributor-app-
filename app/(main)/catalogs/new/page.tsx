import { CatalogUpload } from "@/components/CatalogUpload";

export default function NewCatalogPage() {
  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload catalog</h1>
        <p className="mt-1 text-sm text-slate-600">
          This is how products get into the app. The first PDF should look like
          “N new products”, not a matching failure.
        </p>
      </div>
      <CatalogUpload />
    </main>
  );
}
