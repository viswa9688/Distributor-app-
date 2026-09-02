import Link from "next/link";
import { QuoteList } from "@/components/QuoteList";

export default function QuotesPage() {
  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <Link href="/sell" className="text-sm text-slate-600 underline">
          Sell
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">All quotes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Filter by time. Open a client page to see quotes for one retailer.
        </p>
      </div>
      <QuoteList title="Quotes" />
    </main>
  );
}
