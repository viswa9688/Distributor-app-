"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatQuoteDate, formatQuoteTime } from "@/lib/format-datetime";

type QuoteRow = {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  grandTotal: number;
};

const PRESETS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

export function QuoteList({
  clientId,
  title,
  newQuoteHref,
  defaultPreset = "30d",
}: {
  clientId?: string;
  title: string;
  newQuoteHref?: string;
  defaultPreset?: string;
}) {
  const [preset, setPreset] = useState(defaultPreset);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ preset });
    if (clientId) params.set("clientId", clientId);
    fetch(`/api/quotes?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setQuotes(data);
      })
      .finally(() => setLoading(false));
  }, [clientId, preset]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-500">{title}</h2>
        {newQuoteHref ? (
          <Link href={newQuoteHref} className="text-xs font-medium underline">
            New quote
          </Link>
        ) : null}
      </div>
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : quotes.length === 0 ? (
        <p className="text-sm text-slate-500">No quotes in this period.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {quotes.map((q) => (
            <li key={q.id}>
              <Link
                href={`/quotes/${q.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span>
                  {!clientId ? (
                    <span className="block text-sm font-medium">{q.clientName}</span>
                  ) : null}
                  <span className="block text-xs text-slate-600">
                    {formatQuoteDate(q.createdAt)}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {formatQuoteTime(q.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-slate-700">
                  {q.grandTotal.toFixed(2)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
