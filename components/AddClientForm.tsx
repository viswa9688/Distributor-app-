"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const payload = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not add client.");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
      <label className="flex flex-col gap-1 text-sm">
        New client
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shop or retailer name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add client"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
