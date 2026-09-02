import { prisma } from "@/lib/prisma";
import { processCatalogImport } from "@/lib/catalog";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as { filePath?: string; manufacturerId?: string };
  const filePath = body.filePath?.trim();
  const manufacturerId = body.manufacturerId?.trim();

  if (!filePath) {
    return NextResponse.json({ error: "filePath is required." }, { status: 400 });
  }
  if (!manufacturerId) {
    return NextResponse.json({ error: "manufacturerId is required." }, { status: 400 });
  }

  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id: manufacturerId },
    select: { id: true },
  });
  if (!manufacturer) {
    return NextResponse.json({ error: "Manufacturer not found." }, { status: 404 });
  }

  const catalog = await prisma.catalogImport.create({
    data: {
      filePath,
      manufacturerId,
      createdBy: user.id,
      status: "PROCESSING",
    },
  });

  try {
    await processCatalogImport(catalog.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog OCR failed.";
    return NextResponse.json(
      { id: catalog.id, status: "FAILED", error: message },
      { status: 500 },
    );
  }

  const updated = await prisma.catalogImport.findUnique({
    where: { id: catalog.id },
    select: { id: true, status: true, error: true },
  });
  return NextResponse.json(updated);
}
