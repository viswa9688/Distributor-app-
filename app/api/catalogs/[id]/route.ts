import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const catalog = await prisma.catalogImport.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { rawName: "asc" } },
      extraCharges: true,
    },
  });
  if (!catalog) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: catalog.id,
    status: catalog.status,
    error: catalog.error,
    filePath: catalog.filePath,
    extraCharges: catalog.extraCharges.map((c) => ({
      id: c.id,
      name: c.name,
      amount: c.amount !== null ? Number(c.amount) : null,
      percent: c.percent !== null ? Number(c.percent) : null,
    })),
    lines: catalog.lines.map((line) => ({
      id: line.id,
      rawName: line.rawName,
      sku: line.sku,
      unit: line.unit,
      price: Number(line.price),
      matchedProductId: line.matchedProductId,
      action: line.action,
      matchConfidence: line.matchConfidence,
      matchCandidates: line.matchCandidates,
    })),
  });
}
