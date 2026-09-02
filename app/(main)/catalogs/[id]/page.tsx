import Link from "next/link";
import { CatalogReview } from "@/components/CatalogReview";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const catalog = await prisma.catalogImport.findUnique({
    where: { id },
    include: {
      manufacturer: { select: { id: true, name: true } },
      lines: { orderBy: { rawName: "asc" } },
      extraCharges: true,
    },
  });

  if (!catalog) {
    return (
      <main className="flex flex-col gap-4 pb-6">
        <h1 className="text-2xl font-semibold">Catalog review</h1>
        <EmptyState
          title="Catalog not found"
          body="That import does not exist."
          actionHref="/manufacturers"
          actionLabel="Manufacturers"
        />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <Link
          href={`/manufacturers/${catalog.manufacturer.id}`}
          className="text-sm text-slate-600 underline"
        >
          {catalog.manufacturer.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Catalog review</h1>
      </div>
      <CatalogReview
        catalogId={catalog.id}
        initialStatus={catalog.status}
        initialError={catalog.error}
        initialCharges={catalog.extraCharges.map((c) => ({
          id: c.id,
          name: c.name,
          amount: c.amount !== null ? Number(c.amount) : null,
          percent: c.percent !== null ? Number(c.percent) : null,
        }))}
        initialLines={catalog.lines.map((line) => ({
          id: line.id,
          rawName: line.rawName,
          sku: line.sku,
          unit: line.unit,
          price: Number(line.price),
          matchedProductId: line.matchedProductId,
          action: line.action,
          matchConfidence: line.matchConfidence,
          matchCandidates: Array.isArray(line.matchCandidates)
            ? (line.matchCandidates as { productId: string; name: string; score: number }[])
            : null,
        }))}
      />
    </main>
  );
}
