"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 20 * 1024 * 1024;

export function ManufacturerFromCatalogUpload() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [suggestedName, setSuggestedName] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [name, setName] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSuggestedName("");
    setFilePath(null);
    setName("");

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("PDF is larger than 20MB.");
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

      const path = `${user.id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("catalogs")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const res = await fetch("/api/manufacturers/from-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: path }),
      });
      const payload = (await res.json()) as {
        suggestedName?: string;
        filePath?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Could not read the PDF.");
        return;
      }
      setFilePath(payload.filePath ?? path);
      setSuggestedName(payload.suggestedName ?? "");
      setName(payload.suggestedName ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    if (!filePath || !name.trim()) {
      setError("Enter a manufacturer name.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/manufacturers/from-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          name: name.trim(),
          confirm: true,
        }),
      });
      const payload = (await res.json()) as {
        id?: string;
        catalogId?: string;
        status?: string;
        error?: string;
      };
      if (!payload.id) {
        setError(payload.error ?? "Could not create manufacturer.");
        return;
      }
      if (payload.catalogId && payload.status !== "FAILED") {
        router.push(`/catalogs/${payload.catalogId}`);
        return;
      }
      if (payload.catalogId && payload.status === "FAILED") {
        router.push(`/catalogs/${payload.catalogId}`);
        return;
      }
      router.push(`/manufacturers/${payload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed.");
    } finally {
      setPending(false);
    }
  }

  if (filePath) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <p className="text-sm text-slate-600">
          Confirm the manufacturer name. Products from this PDF will belong to them only.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Manufacturer name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-900"
          />
          {suggestedName && suggestedName !== name ? (
            <span className="text-xs text-slate-500">
              Suggested from PDF: {suggestedName}
            </span>
          ) : null}
        </label>
        {error ? (
          <p className="text-sm text-red-700" role="alert">{error}</p>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={confirm}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create and read catalog"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
        <span className="text-sm font-medium">
          {pending ? "Reading PDF…" : "Add from catalog PDF"}
        </span>
        <span className="text-xs text-slate-500">
          We will suggest a name from the PDF. You confirm before products are created.
        </span>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={pending}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
