"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 20 * 1024 * 1024;

export function CatalogUpload({ manufacturerId }: { manufacturerId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("PDF is larger than 20MB. Try a smaller file, or we will need a background job later.");
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

      const filePath = `${user.id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("catalogs")
        .upload(filePath, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        setError(
          uploadError.message.includes("Bucket not found")
            ? "Storage bucket “catalogs” is missing. Create it in Supabase (see the step-3 setup)."
            : uploadError.message,
        );
        return;
      }

      const res = await fetch("/api/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, manufacturerId }),
      });
      const payload = (await res.json()) as {
        id?: string;
        status?: string;
        error?: string;
      };
      if (!payload.id) {
        setError(payload.error ?? "Upload failed.");
        return;
      }
      if (payload.status === "FAILED") {
        router.push(`/catalogs/${payload.id}`);
        return;
      }
      router.push(`/catalogs/${payload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
        <span className="text-sm font-medium">
          {pending ? "Reading catalog…" : "Choose a manufacturer PDF"}
        </span>
        <span className="text-xs text-slate-500">
          Long catalogs can take up to a minute. Nothing is saved to products until you review and apply.
        </span>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={pending}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      {pending ? (
        <p className="mt-3 text-center text-sm text-slate-600">
          Finding the price list and extra charges…
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
