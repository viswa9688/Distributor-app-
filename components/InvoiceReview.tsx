"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = { productId: string; name: string; score: number };

type Line = {
  id: string;
  rawDescription: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productId: string | null;
  matchConfidence: string;
  matchCandidates: Candidate[] | null;
};

type ProductOption = { id: string; name: string; sku: string | null };

export function InvoiceReview({
  invoiceId,
  initialStatus,
  initialRetailer,
  initialLines,
  products,
}: {
  invoiceId: string;
  initialStatus: string;
  initialRetailer: string;
  initialLines: Line[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [retailerName, setRetailerName] = useState(initialRetailer);
  const [lines, setLines] = useState(initialLines);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const unmatched = lines.filter((l) => !l.productId).length;
  const matched = lines.length - unmatched;

  async function setProduct(line: Line, productId: string | null) {
    setError(null);
    const res = await fetch(`/api/invoices/${invoiceId}/lines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId: line.id, productId }),
    });
    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Could not update line.");
      return;
    }
    setLines((prev) =>
      prev.map((l) => (l.id === line.id ? { ...l, productId } : l)),
    );
  }

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retailerName }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Confirm failed.");
        return;
      }
      setStatus("CONFIRMED");
      router.refresh();
      router.replace("/invoices");
    } finally {
      setPending(false);
    }
  }

  if (status === "CONFIRMED") {
    return (
      <p className="text-sm text-slate-600">This invoice is already confirmed.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      {products.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          There are no catalog products yet. Lines will stay unmatched text. No
          sell history is written until a product is chosen.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Retailer
        <input
          value={retailerName}
          onChange={(e) => setRetailerName(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-900"
        />
        <span className="text-xs text-slate-500">
          Retailer is a name on this invoice, not a separate list.
        </span>
      </label>

      <p className="text-sm text-slate-600">
        {matched} matched · {unmatched} unmatched. Unmatched lines stay as text.
        Sell history is only appended for matched products. Nothing is a sale
        until you confirm.
      </p>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {lines.map((line) => (
          <li key={line.id} className="space-y-2 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{line.rawDescription}</p>
                <p className="text-xs text-slate-500">
                  Qty {line.quantity} · {line.unitPrice} each · total{" "}
                  {line.lineTotal} · {line.matchConfidence}
                </p>
              </div>
            </div>
            {line.matchConfidence === "MEDIUM" &&
            Array.isArray(line.matchCandidates) &&
            line.matchCandidates.length > 0 &&
            !line.productId ? (
              <div className="flex flex-wrap gap-1">
                {line.matchCandidates.map((c) => (
                  <button
                    key={c.productId}
                    type="button"
                    className="rounded-full bg-slate-100 px-2 py-1 text-xs"
                    onClick={() => setProduct(line, c.productId)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ) : null}
            <select
              className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
              value={line.productId ?? ""}
              onChange={(e) =>
                setProduct(line, e.target.value === "" ? null : e.target.value)
              }
            >
              <option value="">Unmatched (no sell history)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.sku ? ` (${p.sku})` : ""}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Confirming…" : "Confirm sale"}
      </button>
    </div>
  );
}
