"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export function InvoiceCapture() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
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
        body: JSON.stringify({ filePath }),
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
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl bg-slate-900 px-4 py-8 text-center text-white">
          <span className="text-sm font-medium">
            {pending ? "Reading invoice…" : "Take a photo"}
          </span>
          <span className="text-xs text-slate-300">
            Uses the rear camera on a phone. Nothing is saved as a sale until you confirm.
          </span>
          <input
            type="file"
            accept={ACCEPT}
            capture="environment"
            className="hidden"
            disabled={pending}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center">
          <span className="text-sm font-medium">
            {pending ? "Please wait…" : "Choose from gallery"}
          </span>
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={pending}
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
