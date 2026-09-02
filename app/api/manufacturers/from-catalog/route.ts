import { prisma } from "@/lib/prisma";
import { processCatalogImport } from "@/lib/catalog";
import { suggestManufacturerNameFromPdf } from "@/lib/manufacturer";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as {
    filePath?: string;
    name?: string;
    confirm?: boolean;
  };

  const filePath = body.filePath?.trim();
  if (!filePath) {
    return NextResponse.json({ error: "filePath is required." }, { status: 400 });
  }

  if (!body.confirm) {
    try {
      const suggestedName = await suggestManufacturerNameFromPdf(filePath);
      return NextResponse.json({
        suggestedName: suggestedName ?? "",
        filePath,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not read the PDF.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const finalName = (body.name?.trim() || "").length > 0 ? body.name!.trim() : null;
  if (!finalName) {
    return NextResponse.json({ error: "name is required to confirm." }, { status: 400 });
  }

  const manufacturer = await prisma.manufacturer.create({
    data: { name: finalName },
    select: { id: true, name: true },
  });

  const catalog = await prisma.catalogImport.create({
    data: {
      filePath,
      manufacturerId: manufacturer.id,
      createdBy: user.id,
      status: "PROCESSING",
    },
  });

  try {
    await processCatalogImport(catalog.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog OCR failed.";
    return NextResponse.json(
      {
        id: manufacturer.id,
        name: manufacturer.name,
        catalogId: catalog.id,
        status: "FAILED",
        error: message,
      },
      { status: 500 },
    );
  }

  const updated = await prisma.catalogImport.findUnique({
    where: { id: catalog.id },
    select: { id: true, status: true, error: true },
  });

  return NextResponse.json({
    id: manufacturer.id,
    name: manufacturer.name,
    catalogId: updated?.id,
    status: updated?.status,
    error: updated?.error,
  });
}
