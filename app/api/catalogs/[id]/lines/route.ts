import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { CatalogLineAction } from "@prisma/client";
import { NextResponse } from "next/server";

const ACTIONS: CatalogLineAction[] = ["CREATE", "UPDATE", "SKIP", "UNCERTAIN"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const body = (await request.json()) as {
    lineId?: string;
    action?: CatalogLineAction;
    matchedProductId?: string | null;
  };

  if (!body.lineId || !body.action || !ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "Invalid line update." }, { status: 400 });
  }

  const line = await prisma.catalogLine.findFirst({
    where: { id: body.lineId, catalogImportId: id },
  });
  if (!line) {
    return NextResponse.json({ error: "Line not found." }, { status: 404 });
  }

  const updated = await prisma.catalogLine.update({
    where: { id: line.id },
    data: {
      action: body.action,
      matchedProductId:
        body.matchedProductId === undefined
          ? line.matchedProductId
          : body.matchedProductId,
    },
  });

  return NextResponse.json({
    id: updated.id,
    action: updated.action,
    matchedProductId: updated.matchedProductId,
  });
}
