import { Suspense } from "react";
import { isSignupAllowed, isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
        Distributor
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Staff share one product list, one set of invoices, and one price history.
      </p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {configured ? (
          <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
            <LoginForm signupAllowed={isSignupAllowed()} />
          </Suspense>
        ) : (
          <div className="space-y-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Supabase is not configured yet.</p>
            <ol className="list-decimal space-y-2 pl-4">
              <li>Create a Supabase project (Email auth on).</li>
              <li>
                Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{" "}
                <code className="rounded bg-slate-100 px-1">.env</code>.
              </li>
              <li>Paste the project URL, anon key, and Postgres URLs.</li>
              <li>Restart the dev server.</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
