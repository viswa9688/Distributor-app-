"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold">This page could not load</h1>
      <p className="mt-2 text-sm text-slate-600">
        A server error occurred. If you just deployed, check that every{" "}
        <code className="rounded bg-slate-100 px-1">.env</code> key is set in
        Vercel and that you redeployed after adding them.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
      >
        Try again
      </button>
    </main>
  );
}
