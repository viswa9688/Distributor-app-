import { EmptyState } from "@/components/EmptyState";

export default function NewCatalogPage() {
  return (
    <main className="flex flex-col gap-4 pb-6">
      <h1 className="text-2xl font-semibold">Upload catalog</h1>
      <EmptyState
        title="PDF upload comes in a later step"
        body="This is how products get into the app. Step 3 will take a manufacturer PDF, find the price list and extra charges, and let you review before anything is saved."
        actionHref="/"
        actionLabel="Back home"
      />
    </main>
  );
}
