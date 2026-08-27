"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export function AppShell({
  children,
  email,
  authConfigured,
}: {
  children: React.ReactNode;
  email: string | null;
  authConfigured: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-20">
      {!authConfigured ? (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-950">
          Supabase is not configured. Copy .env.example to .env so sign-in works.
        </div>
      ) : null}
      <header className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold">Distributor</p>
        {email ? (
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-slate-500 underline"
          >
            Sign out
          </button>
        ) : null}
      </header>
      <div className="px-4">{children}</div>
      <BottomNav pathname={pathname} />
    </div>
  );
}
