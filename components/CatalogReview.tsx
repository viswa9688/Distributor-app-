"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = { productId: string; name: string; score: number };

type Line = {
  id: string;
  rawName: string;
  sku: string | null;
  unit: string | null;
  price: number;
  matchedProductId: string | null;
  action: "CREATE" | "UPDATE" | "SKIP" | "UNCERTAIN";
  matchConfidence: string;
  matchCandidates: Candidate[] | null;
};

type Charge = {
  id: string;
  name: string;
  amount: number | null;
  percent: number | null;
};

export function CatalogReview({
  catalogId,
  initialStatus,
  initialError,
  initialLines,
  initialCharges,
}: {
  catalogId: string;
  initialStatus: string;
  initialError: string | null;
  initialLines: Line[];
  initialCharges: Charge[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState(initialLines);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  const groups = useMemo(() => {
    return {
      create: lines.filter((l) => l.action === "CREATE"),
      update: lines.filter((l) => l.action === "UPDATE"),
      uncertain: lines.filter((l) => l.action === "UNCERTAIN"),
      skip: lines.filter((l) => l.action === "SKIP"),
    };
  }, [lines]);

  async function setAction(line: Line, action: Line["action"], matchedProductId?: string | null) {
    const res = await fetch(`/api/catalogs/${catalogId}/lines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineId: line.id,
        action,
        matchedProductId,
      }),
    });
    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Could not update row.");
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l.id === line.id
          ? {
              ...l,
              action,
              matchedProductId:
                matchedProductId === undefined ? l.matchedProductId : matchedProductId,
            }
          : l,
      ),
    );
  }

  async function apply() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalogs/${catalogId}/apply`, { method: "POST" });
      const payload = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        setError(payload.error ?? "Apply failed.");
        return;
      }
      setStatus("APPLIED");
      router.push("/products");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function retry() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalogs/${catalogId}/retry`, { method: "POST" });
      const payload = (await res.json()) as { error?: string; status?: string };
      if (payload.status === "FAILED" || !res.ok) {
        setError(payload.error ?? "Retry failed. This is the same handler, not a job queue.");
        setStatus("FAILED");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (status === "PROCESSING") {
    return (
      <p className="text-sm text-slate-600">Still reading this catalog… Refresh in a moment.</p>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{error ?? "Catalog OCR failed."}</p>
        <p className="text-xs text-slate-500">
          Retry runs the same request again. A long PDF may hit the server time limit.
        </p>
        <button
          type="button"
          onClick={retry}
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  if (status === "APPLIED") {
    return <p className="text-sm text-slate-600">This catalog is already applied.</p>;
  }

  const uncertainCount = groups.uncertain.length;

  return (
    <div className="flex flex-col gap-6 pb-6">
      <p className="text-sm text-slate-600">
        {groups.create.length} new product{groups.create.length === 1 ? "" : "s"}
        {groups.update.length > 0
          ? ` · ${groups.update.length} price update${groups.update.length === 1 ? "" : "s"}`
          : ""}
        {uncertainCount > 0 ? ` · ${uncertainCount} need a decision` : ""}
        . Nothing is written to products until you apply.
      </p>

      {initialCharges.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-slate-500">Extra charges</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {initialCharges.map((c) => (
              <li key={c.id}>
                {c.name}
                {c.amount !== null ? ` · ${c.amount}` : ""}
                {c.percent !== null ? ` · ${c.percent}%` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LineGroup
        title="New products"
        empty="None — first catalogs usually land here."
        lines={groups.create}
        onAction={setAction}
      />
      <LineGroup
        title="Price updates"
        empty="None on this catalog."
        lines={groups.update}
        onAction={setAction}
      />
      <LineGroup
        title="Uncertain"
        empty="None."
        lines={groups.uncertain}
        onAction={setAction}
      />
      {groups.skip.length > 0 ? (
        <LineGroup title="Skipped" empty="" lines={groups.skip} onAction={setAction} />
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={apply}
        disabled={pending || uncertainCount > 0}
        className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending
          ? "Applying…"
          : uncertainCount > 0
            ? `Resolve ${uncertainCount} uncertain row(s) first`
            : "Apply to products"}
      </button>
    </div>
  );
}

function LineGroup({
  title,
  empty,
  lines,
  onAction,
}: {
  title: string;
  empty: string;
  lines: Line[];
  onAction: (line: Line, action: Line["action"], matchedProductId?: string | null) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-slate-500">{title}</h2>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {lines.map((line) => (
            <li key={line.id} className="px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{line.rawName}</p>
                  <p className="text-xs text-slate-500">
                    {line.sku ? `${line.sku} · ` : ""}
                    {line.unit ? `${line.unit} · ` : ""}
                    {line.price}
                  </p>
                </div>
                <select
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  value={line.action}
                  onChange={(e) =>
                    onAction(line, e.target.value as Line["action"])
                  }
                >
                  <option value="CREATE">New</option>
                  <option value="UPDATE">Update</option>
                  <option value="SKIP">Skip</option>
                  <option value="UNCERTAIN">Uncertain</option>
                </select>
              </div>
              {line.action === "UNCERTAIN" &&
              Array.isArray(line.matchCandidates) &&
              line.matchCandidates.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {line.matchCandidates.map((c) => (
                    <button
                      key={c.productId}
                      type="button"
                      className="rounded-full bg-slate-100 px-2 py-1 text-xs"
                      onClick={() => onAction(line, "UPDATE", c.productId)}
                    >
                      {c.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="rounded-full bg-slate-900 px-2 py-1 text-xs text-white"
                    onClick={() => onAction(line, "CREATE", null)}
                  >
                    Treat as new
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
