import { processCatalogImport } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const catalog = await prisma.catalogImport.findUnique({ where: { id } });
  if (!catalog) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await processCatalogImport(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retry failed.";
    return NextResponse.json({ id, status: "FAILED", error: message }, { status: 500 });
  }

  const updated = await prisma.catalogImport.findUnique({
    where: { id },
    select: { id: true, status: true, error: true },
  });
  return NextResponse.json(updated);
}
