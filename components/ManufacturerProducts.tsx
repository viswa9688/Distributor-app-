"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  currentBuyPrice: number;
};

type Draft = {
  name: string;
  sku: string;
  unit: string;
  currentBuyPrice: string;
};

function emptyDraft(): Draft {
  return { name: "", sku: "", unit: "", currentBuyPrice: "" };
}

function rowToDraft(p: ProductRow): Draft {
  return {
    name: p.name,
    sku: p.sku ?? "",
    unit: p.unit ?? "",
    currentBuyPrice: String(p.currentBuyPrice),
  };
}

export function ManufacturerProducts({
  manufacturerId,
  initialProducts,
}: {
  manufacturerId: string;
  initialProducts: ProductRow[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft());
  const [pending, setPending] = useState(false);

  async function createProduct() {
    const price = Number(addDraft.currentBuyPrice);
    if (!addDraft.name.trim() || !Number.isFinite(price) || price < 0) {
      setError("Name and a valid buy price are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturerId,
          name: addDraft.name.trim(),
          sku: addDraft.sku.trim() || null,
          unit: addDraft.unit.trim() || null,
          currentBuyPrice: price,
        }),
      });
      const payload = (await res.json()) as ProductRow & { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not add product.");
        return;
      }
      setProducts((prev) =>
        [...prev, payload].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setAddDraft(emptyDraft());
      setAdding(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function saveEdit(product: ProductRow) {
    const price = Number(editDraft.currentBuyPrice);
    if (!editDraft.name.trim() || !Number.isFinite(price) || price < 0) {
      setError("Name and a valid buy price are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          sku: editDraft.sku.trim() || null,
          unit: editDraft.unit.trim() || null,
          currentBuyPrice: price,
        }),
      });
      const payload = (await res.json()) as ProductRow & { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not save product.");
        return;
      }
      setProducts((prev) =>
        prev
          .map((p) => (p.id === product.id ? payload : p))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingId(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function deleteProduct(product: ProductRow) {
    if (
      !window.confirm(
        `Delete “${product.name}”? Invoice lines linked to it will become unmatched.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not delete product.");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      if (editingId === product.id) setEditingId(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function startEdit(product: ProductRow) {
    setEditingId(product.id);
    setEditDraft(rowToDraft(product));
    setError(null);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-500">Products</h2>
        {!adding ? (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setAddDraft(emptyDraft());
              setError(null);
            }}
            className="text-xs font-medium text-slate-700 underline"
          >
            Add product
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
          <p className="text-xs text-slate-500">Add a product manually for this manufacturer.</p>
          <input
            value={addDraft.name}
            onChange={(e) => setAddDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Product name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={addDraft.sku}
              onChange={(e) => setAddDraft((d) => ({ ...d, sku: e.target.value }))}
              placeholder="SKU"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            />
            <input
              value={addDraft.unit}
              onChange={(e) => setAddDraft((d) => ({ ...d, unit: e.target.value }))}
              placeholder="Unit"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            />
            <input
              value={addDraft.currentBuyPrice}
              onChange={(e) =>
                setAddDraft((d) => ({ ...d, currentBuyPrice: e.target.value }))
              }
              placeholder="Buy price"
              type="number"
              min={0}
              step="any"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={createProduct}
              disabled={pending}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save product"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {products.length === 0 && !adding ? (
        <p className="text-sm text-slate-500">
          No products yet. Scan a catalog PDF or add one manually.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {products.map((p) => (
            <li key={p.id} className="px-3 py-3">
              {editingId === p.id ? (
                <div className="space-y-2">
                  <input
                    value={editDraft.name}
                    onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={editDraft.sku}
                      onChange={(e) => setEditDraft((d) => ({ ...d, sku: e.target.value }))}
                      placeholder="SKU"
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                    />
                    <input
                      value={editDraft.unit}
                      onChange={(e) => setEditDraft((d) => ({ ...d, unit: e.target.value }))}
                      placeholder="Unit"
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                    />
                    <input
                      value={editDraft.currentBuyPrice}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, currentBuyPrice: e.target.value }))
                      }
                      placeholder="Buy price"
                      type="number"
                      min={0}
                      step="any"
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(p)}
                      disabled={pending}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    >
                      {pending ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/products/${p.id}`} className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-slate-500">
                      {p.sku ? `${p.sku} · ` : ""}
                      {p.unit ? `${p.unit} · ` : ""}
                      Buy {p.currentBuyPrice}
                    </span>
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProduct(p)}
                      disabled={pending}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
