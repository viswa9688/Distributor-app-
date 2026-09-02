"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductEditor({
  productId,
  manufacturerId,
  manufacturerName,
  initialName,
  initialSku,
  initialUnit,
  initialBuyPrice,
}: {
  productId: string;
  manufacturerId: string;
  manufacturerName: string;
  initialName: string;
  initialSku: string | null;
  initialUnit: string | null;
  initialBuyPrice: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [sku, setSku] = useState(initialSku ?? "");
  const [unit, setUnit] = useState(initialUnit ?? "");
  const [buyPrice, setBuyPrice] = useState(String(initialBuyPrice));
  const [displayName, setDisplayName] = useState(initialName);
  const [displaySku, setDisplaySku] = useState(initialSku);
  const [displayUnit, setDisplayUnit] = useState(initialUnit);
  const [displayBuyPrice, setDisplayBuyPrice] = useState(initialBuyPrice);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    const price = Number(buyPrice);
    if (!name.trim() || !Number.isFinite(price) || price < 0) {
      setError("Name and a valid buy price are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || null,
          unit: unit.trim() || null,
          currentBuyPrice: price,
        }),
      });
      const payload = (await res.json()) as {
        name: string;
        sku: string | null;
        unit: string | null;
        currentBuyPrice: number;
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Could not save.");
        return;
      }
      setDisplayName(payload.name);
      setDisplaySku(payload.sku);
      setDisplayUnit(payload.unit);
      setDisplayBuyPrice(payload.currentBuyPrice);
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function deleteProduct() {
    if (
      !window.confirm(
        `Delete “${displayName}”? Invoice lines linked to it will become unmatched.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not delete.");
        return;
      }
      router.replace(`/manufacturers/${manufacturerId}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    setName(displayName);
    setSku(displaySku ?? "");
    setUnit(displayUnit ?? "");
    setBuyPrice(String(displayBuyPrice));
    setEditing(false);
    setError(null);
  }

  return (
    <div>
      <Link href="/products" className="text-sm text-slate-600 underline">
        Products
      </Link>
      {editing ? (
        <div className="mt-2 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Buy price"
              type="number"
              min={0}
              step="any"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deleteProduct}
              disabled={pending}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              Edit
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            <Link
              href={`/manufacturers/${manufacturerId}`}
              className="underline"
            >
              {manufacturerName}
            </Link>
            {displaySku ? ` · ${displaySku}` : " · No SKU"}
            {displayUnit ? ` · ${displayUnit}` : ""}
          </p>
          <p className="mt-2 text-base font-medium">
            Current buy {displayBuyPrice.toFixed(2)}
          </p>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
