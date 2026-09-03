"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  MockableNumber,
  MockableString,
  RateHistoryRow,
  RateView,
} from "@/lib/rate-view";

type SearchHit = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  buyPrice: number;
  manufacturer: { id: string; name: string };
};

function withMock(text: string, mock: boolean): string {
  return mock ? `${text} (mock)` : text;
}

function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatQty(value: number, unit: string): string {
  const n =
    Number.isInteger(value) ? String(value) : value.toLocaleString("en-IN");
  return `${n} ${unit}`;
}

function MockableText({
  field,
  format,
}: {
  field: MockableNumber | MockableString;
  format: (v: number | string) => string;
}) {
  return (
    <span>
      {withMock(format(field.value as number & string), field.mock)}
    </span>
  );
}

function KpiCard({
  label,
  field,
  format,
}: {
  label: string;
  field: MockableNumber;
  format: (v: number) => string;
}) {
  return (
    <div className="min-w-[7.5rem] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        <MockableText field={field} format={(v) => format(Number(v))} />
      </p>
    </div>
  );
}

function HistoryTable({
  title,
  unit,
  rows,
  summary,
}: {
  title: string;
  unit: string;
  rows: RateHistoryRow[];
  summary?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-sm ${
            title === "PURCHASE" ? "bg-sky-500" : "bg-emerald-500"
          }`}
        />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          {title}
        </h3>
      </div>
      {summary ? (
        <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
          {summary}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Party name</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Disc %</th>
              <th className="px-3 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                  <MockableText field={row.date} format={(v) => String(v)} />
                </td>
                <td className="px-3 py-2 text-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.latest && !row.mockRow ? (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-800">
                        Latest
                      </span>
                    ) : null}
                    <MockableText
                      field={row.partyName}
                      format={(v) => String(v)}
                    />
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <MockableText
                    field={row.qty}
                    format={(v) => formatQty(Number(v), unit)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <MockableText
                    field={row.rate}
                    format={(v) => formatInr(Number(v))}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <MockableText
                    field={row.discPercent}
                    format={(v) => String(v)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <MockableText
                    field={row.amount}
                    format={(v) => formatInr(Number(v))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RateLookup() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<RateView | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      fetch(`/api/rate/products?q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Search failed.");
          return res.json() as Promise<SearchHit[]>;
        })
        .then((data) => setHits(Array.isArray(data) ? data : []))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  const loadProduct = useCallback(async (id: string, name: string) => {
    setSelectedId(id);
    setQuery(name);
    setHits([]);
    setLoadingView(true);
    setError(null);
    try {
      const res = await fetch(`/api/rate/products/${id}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not load rate.");
      }
      const data = (await res.json()) as RateView;
      setView(data);
    } catch (err) {
      setView(null);
      setError(err instanceof Error ? err.message : "Could not load rate.");
    } finally {
      setLoadingView(false);
    }
  }, []);

  function clearSelection() {
    setQuery("");
    setHits([]);
    setSelectedId(null);
    setView(null);
    setError(null);
  }

  const purchaseSummary =
    view && view.purchases.length > 0
      ? (() => {
          const first = view.purchases[0];
          return `Last purchased on ${withMock(
            first.date.value,
            first.date.mock,
          )} · ${withMock(
            formatQty(first.qty.value, view.product.unit),
            first.qty.mock,
          )} @ ${withMock(formatInr(first.rate.value), first.rate.mock)}`;
        })()
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <span className="text-slate-400" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId(null);
              setView(null);
            }}
            placeholder="Search product name or SKU"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-slate-500 underline"
            >
              Clear
            </button>
          ) : null}
        </div>
        {query.trim() && !selectedId ? (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {searching ? (
              <li className="px-3 py-2 text-xs text-slate-500">Searching…</li>
            ) : hits.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">No products found.</li>
            ) : (
              hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => void loadProduct(hit.id, hit.name)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {hit.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {hit.manufacturer.name}
                      {hit.sku ? ` · ${hit.sku}` : ""} · {formatInr(hit.buyPrice)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {!view && !loadingView && !error ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Search a product to see rates.
        </p>
      ) : null}

      {loadingView ? (
        <p className="text-sm text-slate-500">Loading rate…</p>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {view ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <KpiCard
              label="Sales 6M qty"
              field={view.kpis.sales6mQty}
              format={(v) => formatQty(v, view.product.unit)}
            />
            <KpiCard
              label="Purchase 1M qty"
              field={view.kpis.purchase1mQty}
              format={(v) => formatQty(v, view.product.unit)}
            />
            <KpiCard
              label="Closing stock qty"
              field={view.kpis.closingStockQty}
              format={(v) => formatQty(v, view.product.unit)}
            />
            <KpiCard
              label="Purchase rate per unit"
              field={view.kpis.purchaseRatePerUnit}
              format={formatInr}
            />
            <KpiCard
              label="Closing stock amount"
              field={view.kpis.closingStockAmount}
              format={formatInr}
            />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Rate as per last price list (per {view.hero.unitLabel})
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  <MockableText
                    field={view.hero.rate}
                    format={(v) => formatInr(Number(v))}
                  />
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <MockableText
                    field={view.hero.sourceLabel}
                    format={(v) => String(v)}
                  />
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-500">
                  <MockableText
                    field={view.hero.dateLabel}
                    format={(v) => String(v)}
                  />
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                  Current
                </span>
              </div>
            </div>
          </section>

          <p className="text-sm font-medium text-slate-800">
            Name: {view.product.name}
          </p>

          <div className="flex flex-col gap-4">
            <HistoryTable
              title="PURCHASE"
              unit={view.product.unit}
              rows={view.purchases}
              summary={purchaseSummary}
            />
            <HistoryTable
              title="SALES"
              unit={view.product.unit}
              rows={view.sales}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
