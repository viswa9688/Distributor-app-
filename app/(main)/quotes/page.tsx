import Link from "next/link";
import { QuoteList } from "@/components/QuoteList";

export default function QuotesPage() {
  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <Link href="/clients" className="text-sm text-slate-600 underline">
          Clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">All quotes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every saved sales quote across clients. Each row shows date and time
          created. Filter by period, or open a client for their full list.
        </p>
      </div>
      <QuoteList title="Quotes" defaultPreset="30d" />
    </main>
  );
}
