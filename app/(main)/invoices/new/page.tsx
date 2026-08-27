import { EmptyState } from "@/components/EmptyState";

export default function NewInvoicePage() {
  return (
    <main className="flex flex-col gap-4 pb-6">
      <h1 className="text-2xl font-semibold">Scan invoice</h1>
      <EmptyState
        title="Camera comes in a later step"
        body="This screen will use the phone camera (and gallery as a fallback). Invoice OCR is step 5. You can still look around the rest of the app."
        actionHref="/"
        actionLabel="Back home"
      />
    </main>
  );
}
