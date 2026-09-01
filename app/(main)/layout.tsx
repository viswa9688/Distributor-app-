import { isSupabaseConfigured } from "@/lib/env";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell authConfigured={isSupabaseConfigured()}>{children}</AppShell>
  );
}
