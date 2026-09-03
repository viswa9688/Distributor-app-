import { RateLookup } from "@/components/RateLookup";

export default function RatePage() {
  return (
    <main className="flex flex-col gap-4 pb-6">
      <h1 className="text-lg font-semibold text-slate-900">Rate</h1>
      <RateLookup />
    </main>
  );
}
