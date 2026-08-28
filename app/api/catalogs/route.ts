import { prisma } from "@/lib/prisma";
import { processCatalogImport } from "@/lib/catalog";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as { filePath?: string };
  const filePath = body.filePath?.trim();
  if (!filePath) {
    return NextResponse.json({ error: "filePath is required." }, { status: 400 });
  }

  const catalog = await prisma.catalogImport.create({
    data: {
      filePath,
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
