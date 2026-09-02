"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddManufacturerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = (await res.json()) as { id?: string; error?: string };
      if (!payload.id) {
        setError(payload.error ?? "Could not create manufacturer.");
        return;
      }
      router.push(`/manufacturers/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Manufacturer name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-900"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Add manufacturer"}
      </button>
    </form>
  );
}
