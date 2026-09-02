"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  lineTotal,
} from "@/lib/quote-cost";

type ClientOption = { id: string; name: string; quoteCount?: number };

type SellProduct = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  buyPrice: number;
  baseCost: number;
  manufacturer: { id: string; name: string };
};

type CartLine = {
  productId: string;
  name: string;
  sku: string | null;
  unit: string | null;
  buyPrice: number;
  baseCost: number;
  manufacturerName: string;
  quantity: string;
};

export function SellQuoteBuilder({
  initialClients,
  initialClientId,
}: {
  initialClients: ClientOption[];
  initialClientId?: string;
}) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [newClientName, setNewClientName] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [products, setProducts] = useState<SellProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [query, setQuery] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/sell/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  const manufacturers = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      map.set(p.manufacturer.id, p.manufacturer.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (manufacturerId && p.manufacturer.id !== manufacturerId) return false;
      if (!q) return true;
      const hay = [p.name, p.sku, p.unit, p.manufacturer.name, String(p.buyPrice)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [products, query, manufacturerId]);

  const cartWithTotals = useMemo(() => {
    return cart.map((line) => {
      const qty = Number(line.quantity);
      const unitCost = line.baseCost;
      const total =
        Number.isFinite(qty) && qty > 0 ? lineTotal(unitCost, qty) : 0;
      return { ...line, unitCost, lineTotal: total };
    });
  }, [cart]);

  const grandTotal = cartWithTotals.reduce((s, l) => s + l.lineTotal, 0);

  function addToCart(product: SellProduct) {
    if (cart.some((c) => c.productId === product.id)) return;
    setCart((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        buyPrice: product.buyPrice,
        baseCost: product.baseCost,
        manufacturerName: product.manufacturer.name,
        quantity: "1",
      },
    ]);
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  async function createClient() {
    const name = newClientName.trim();
    if (!name) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await res.json()) as ClientOption & { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not add client.");
        return;
      }
      setClients((prev) =>
        [...prev, { id: payload.id, name: payload.name, quoteCount: 0 }].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      );
      setClientId(payload.id);
      setNewClientName("");
      setAddingClient(false);
    } finally {
      setPending(false);
    }
  }

  async function saveQuote() {
    if (!clientId) {
      setError("Select a client before saving.");
      return;
    }
    if (cart.length === 0) {
      setError("Add at least one product.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          lines: cart.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        }),
      });
      const payload = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !payload.id) {
        setError(payload.error ?? "Could not save quote.");
        return;
      }
      setCart([]);
      router.push(`/quotes/${payload.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Pick a client, add products, set quantity. Total cost = buy price +
          extra charges per unit.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
        <label className="flex flex-col gap-1 text-sm">
          Client
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        {addingClient ? (
          <div className="flex gap-2">
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Client name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={createClient}
              disabled={pending}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setAddingClient(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingClient(true)}
            className="text-xs font-medium text-slate-700 underline"
          >
            Add new client
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-500">Products</h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={manufacturerId}
          onChange={(e) => setManufacturerId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All manufacturers</option>
          {manufacturers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {loadingProducts ? (
          <p className="text-sm text-slate-500">Loading products…</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-slate-500">No products match.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {filteredProducts.map((p) => {
              const inCart = cart.some((c) => c.productId === p.id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.manufacturer.name}
                      {p.sku ? ` · ${p.sku}` : ""}
                      {p.unit ? ` · ${p.unit}` : ""}
                      · cost {p.baseCost}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={inCart}
                    onClick={() => addToCart(p)}
                    className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    {inCart ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {cart.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-500">Quote</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {cartWithTotals.map((line) => (
              <li key={line.productId} className="space-y-2 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-slate-500">
                      {line.manufacturerName} · unit cost{" "}
                      {line.unitCost.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.productId)}
                    className="text-xs text-red-700 underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-500">
                    Qty
                    <input
                      value={line.quantity}
                      onChange={(e) =>
                        setCart((prev) =>
                          prev.map((c) =>
                            c.productId === line.productId
                              ? { ...c, quantity: e.target.value }
                              : c,
                          ),
                        )
                      }
                      type="number"
                      min={0}
                      step="any"
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <div className="text-xs text-slate-500">
                    Total (all units)
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {line.lineTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium">
            Grand total: {grandTotal.toFixed(2)}
          </p>
          <button
            type="button"
            onClick={saveQuote}
            disabled={pending}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save sales quote"}
          </button>
        </section>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
