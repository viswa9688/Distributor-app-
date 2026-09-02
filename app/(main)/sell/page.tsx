import { SellQuoteBuilder } from "@/components/SellQuoteBuilder";
import { prisma } from "@/lib/prisma";

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { quotes: true } },
    },
  });

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Sell</h1>
        <p className="mt-1 text-sm text-slate-600">
          Build a sales quote for a client with margin on top of buy cost +
          charges.
        </p>
      </div>
      <SellQuoteBuilder
        initialClients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          quoteCount: c._count.quotes,
        }))}
        initialClientId={clientId}
      />
    </main>
  );
}
