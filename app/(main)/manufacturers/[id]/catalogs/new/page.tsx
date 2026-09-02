import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogUpload } from "@/components/CatalogUpload";
import { prisma } from "@/lib/prisma";

export default async function ManufacturerCatalogUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!manufacturer) notFound();

  return (
    <main className="flex flex-col gap-4 pb-6">
      <div>
        <Link
          href={`/manufacturers/${manufacturer.id}`}
          className="text-sm text-slate-600 underline"
        >
          {manufacturer.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Scan catalog PDF</h1>
        <p className="mt-1 text-sm text-slate-600">
          Products from this file are added only to {manufacturer.name}. Review and apply before they land in the list.
        </p>
      </div>
      <CatalogUpload manufacturerId={manufacturer.id} />
    </main>
  );
}
