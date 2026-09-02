import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteList } from "@/components/QuoteList";
import { prisma } from "@/lib/prisma";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!client) notFound();

  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <Link href="/clients" className="text-sm text-slate-600 underline">
          Clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          All sales quotes for this client. Each quote shows date and time created.
        </p>
      </div>
      <QuoteList
        clientId={client.id}
        title="Sales quotes"
        newQuoteHref={`/sell?clientId=${client.id}`}
        defaultPreset="all"
      />
    </main>
  );
}
