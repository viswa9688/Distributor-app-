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

type LineFields = Pick<Line, "rawName" | "sku" | "unit" | "price">;

type Charge = {
  id: string;
  name: string;
  amount: number | null;
  percent: number | null;
};

const ACTION_LABEL: Record<Line["action"], string> = {
  CREATE: "New",
  UPDATE: "Price update",
  SKIP: "Skip",
  UNCERTAIN: "Uncertain",
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

  async function patchLine(
    line: Line,
    patch: {
      action?: Line["action"];
      matchedProductId?: string | null;
      rawName?: string;
      sku?: string | null;
      unit?: string | null;
      price?: number;
    },
  ) {
    setError(null);
    const next: Line = {
      ...line,
      action: patch.action ?? line.action,
      matchedProductId:
        patch.matchedProductId === undefined
          ? line.matchedProductId
          : patch.matchedProductId,
      rawName: patch.rawName ?? line.rawName,
      sku: patch.sku !== undefined ? patch.sku : line.sku,
      unit: patch.unit !== undefined ? patch.unit : line.unit,
      price: patch.price ?? line.price,
    };

    setLines((prev) => prev.map((l) => (l.id === line.id ? next : l)));

    const res = await fetch(`/api/catalogs/${catalogId}/lines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId: line.id, ...patch }),
    });
    if (!res.ok) {
      setLines((prev) => prev.map((l) => (l.id === line.id ? line : l)));
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Could not update row.");
      return false;
    }
    const payload = (await res.json()) as LineFields & {
      action: Line["action"];
      matchedProductId: string | null;
    };
    setLines((prev) =>
      prev.map((l) =>
        l.id === line.id
          ? {
              ...l,
              rawName: payload.rawName ?? l.rawName,
              sku: payload.sku ?? l.sku,
              unit: payload.unit ?? l.unit,
              price: payload.price ?? l.price,
              action: payload.action ?? l.action,
              matchedProductId: payload.matchedProductId ?? l.matchedProductId,
            }
          : l,
      ),
    );
    return true;
  }

  function setAction(
    line: Line,
    action: Line["action"],
    matchedProductId?: string | null,
  ) {
    patchLine(line, { action, matchedProductId });
  }

  function saveFields(line: Line, fields: LineFields) {
    return patchLine(line, fields);
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
      router.refresh();
      router.replace("/products");
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
        . Tap Edit to fix OCR mistakes. Nothing is written until you apply.
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
        onSaveFields={saveFields}
      />
      <LineGroup
        title="Price updates"
        empty="None on this catalog."
        lines={groups.update}
        onAction={setAction}
        onSaveFields={saveFields}
      />
      <LineGroup
        title="Uncertain"
        empty="None."
        lines={groups.uncertain}
        onAction={setAction}
        onSaveFields={saveFields}
      />
      {groups.skip.length > 0 ? (
        <LineGroup
          title="Skipped"
          empty=""
          lines={groups.skip}
          onAction={setAction}
          onSaveFields={saveFields}
        />
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
  onSaveFields,
}: {
  title: string;
  empty: string;
  lines: Line[];
  onAction: (line: Line, action: Line["action"], matchedProductId?: string | null) => void;
  onSaveFields: (line: Line, fields: LineFields) => Promise<boolean>;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-slate-500">{title}</h2>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {lines.map((line) => (
            <CatalogLineRow
              key={line.id}
              line={line}
              onAction={onAction}
              onSaveFields={onSaveFields}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CatalogLineRow({
  line,
  onAction,
  onSaveFields,
}: {
  line: Line;
  onAction: (line: Line, action: Line["action"], matchedProductId?: string | null) => void;
  onSaveFields: (line: Line, fields: LineFields) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    rawName: line.rawName,
    sku: line.sku ?? "",
    unit: line.unit ?? "",
    price: String(line.price),
  });
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({
      rawName: line.rawName,
      sku: line.sku ?? "",
      unit: line.unit ?? "",
      price: String(line.price),
    });
    setEditing(true);
  }

  async function saveEdit() {
    const price = Number(draft.price);
    if (!draft.rawName.trim() || !Number.isFinite(price) || price < 0) {
      return;
    }
    setSaving(true);
    const ok = await onSaveFields(line, {
      rawName: draft.rawName.trim(),
      sku: draft.sku.trim() || null,
      unit: draft.unit.trim() || null,
      price,
    });
    setSaving(false);
    if (ok) setEditing(false);
  }

  const actionOptions: Line["action"][] = ["CREATE", "UPDATE", "SKIP", "UNCERTAIN"].filter(
    (action) => {
      if (action === "UPDATE" && !line.matchedProductId) return false;
      return true;
    },
  ) as Line["action"][];

  return (
    <li className="px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              value={draft.rawName}
              onChange={(e) => setDraft((d) => ({ ...d, rawName: e.target.value }))}
              placeholder="Product name"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                value={draft.sku}
                onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
                placeholder="SKU"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
              <input
                value={draft.unit}
                onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                placeholder="Unit"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
              <input
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                placeholder="Price"
                type="number"
                min={0}
                step="any"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{line.rawName}</p>
            <p className="text-xs text-slate-500">
              {line.sku ? `${line.sku} · ` : ""}
              {line.unit ? `${line.unit} · ` : ""}
              {line.price}
            </p>
          </div>
        )}
        <div className="flex shrink-0 flex-col items-end gap-1">
          {!editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
            >
              Edit
            </button>
          ) : null}
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            value={line.action}
            onChange={(e) =>
              onAction(line, e.target.value as Line["action"])
            }
          >
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {ACTION_LABEL[action]}
              </option>
            ))}
          </select>
        </div>
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
  );
}
