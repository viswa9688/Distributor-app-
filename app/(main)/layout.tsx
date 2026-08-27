import { isSupabaseConfigured } from "@/lib/env";
import { getUser } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authConfigured = isSupabaseConfigured();
  const user = authConfigured ? await getUser() : null;

  return (
    <AppShell email={user?.email ?? null} authConfigured={authConfigured}>
      {children}
    </AppShell>
  );
}
