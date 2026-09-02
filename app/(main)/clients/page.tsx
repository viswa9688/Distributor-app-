import Link from "next/link";
import { AddClientForm } from "@/components/AddClientForm";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { quotes: true } },
    },
  });

  return (
    <main className="flex flex-col gap-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="mt-1 text-sm text-slate-600">
          Retailers you quote to. Open a client to see all their sales quotes
          with date and time created.
        </p>
      </div>
      <AddClientForm />
      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Add a client, then build a quote in Sell."
          actionHref="/sell"
          actionLabel="Open Sell"
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-slate-500">
                  {c._count.quotes} quote{c._count.quotes === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
