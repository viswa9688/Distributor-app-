"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export type ManufacturerOption = {
  id: string;
  name: string;
  productCount: number;
};

export function InvoiceCapture({
  manufacturers,
}: {
  manufacturers: ManufacturerOption[];
}) {
  const router = useRouter();
  const [manufacturerId, setManufacturerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = manufacturers.find((m) => m.id === manufacturerId);
  const canScan = Boolean(selected && selected.productCount > 0);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!canScan || !manufacturerId) {
      setError("Select a manufacturer with products before scanning.");
      return;
    }
    setError(null);
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      setError("Please take or choose a photo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Photo is larger than 10MB. Try another shot.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in required.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)
        ? ext
        : "jpg";
      const filePath = `${user.id}/${crypto.randomUUID()}.${safeExt}`;
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (uploadError) {
        setError(
          uploadError.message.includes("Bucket not found")
            ? "Storage bucket “invoices” is missing. Run supabase/setup-storage.sql."
            : uploadError.message,
        );
        return;
      }

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, manufacturerId }),
      });
      const payload = (await res.json()) as { id?: string; error?: string };
      if (!payload.id) {
        setError(payload.error ?? "Could not read this invoice.");
        return;
      }
      router.push(`/invoices/${payload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <label className="mb-4 flex flex-col gap-1 text-sm">
        Manufacturer
        <select
          value={manufacturerId}
          onChange={(e) => {
            setManufacturerId(e.target.value);
            setError(null);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-900"
        >
          <option value="">Select who you are selling from…</option>
          {manufacturers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.productCount} product{m.productCount === 1 ? "" : "s"})
            </option>
          ))}
        </select>
        {selected && selected.productCount === 0 ? (
          <span className="text-xs text-amber-800">
            Scan a catalog PDF for this manufacturer before invoicing their products.
          </span>
        ) : null}
      </label>

      <div className="flex flex-col gap-3">
        <label
          className={`flex flex-col items-center gap-2 rounded-xl px-4 py-8 text-center ${
            canScan && !pending
              ? "cursor-pointer bg-slate-900 text-white"
              : "cursor-not-allowed bg-slate-200 text-slate-500"
          }`}
        >
          <span className="text-sm font-medium">
            {pending ? "Reading invoice…" : "Take a photo"}
          </span>
          <span className="text-xs opacity-80">
            {canScan
              ? "Nothing is saved as a sale until you confirm."
              : "Pick a manufacturer with products first."}
          </span>
          <input
            type="file"
            accept={ACCEPT}
            capture="environment"
            className="hidden"
            disabled={pending || !canScan}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label
          className={`flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center ${
            canScan && !pending
              ? "cursor-pointer border-slate-300"
              : "cursor-not-allowed border-slate-200 text-slate-400"
          }`}
        >
          <span className="text-sm font-medium">
            {pending ? "Please wait…" : "Choose from gallery"}
          </span>
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={pending || !canScan}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {pending ? (
        <p className="mt-3 text-center text-sm text-slate-600">
          Extracting line items and matching names…
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
