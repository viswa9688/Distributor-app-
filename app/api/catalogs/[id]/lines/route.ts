import { prisma } from "@/lib/prisma";
import { parseBuyPrice } from "@/lib/product";
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
    rawName?: string;
    sku?: string | null;
    unit?: string | null;
    price?: unknown;
  };

  if (!body.lineId) {
    return NextResponse.json({ error: "lineId is required." }, { status: 400 });
  }

  const hasFieldEdit =
    body.rawName !== undefined ||
    body.sku !== undefined ||
    body.unit !== undefined ||
    body.price !== undefined;

  if (!hasFieldEdit && (!body.action || !ACTIONS.includes(body.action))) {
    return NextResponse.json({ error: "Invalid line update." }, { status: 400 });
  }

  const line = await prisma.catalogLine.findFirst({
    where: { id: body.lineId, catalogImportId: id },
  });
  if (!line) {
    return NextResponse.json({ error: "Line not found." }, { status: 404 });
  }

  if (body.action === "UPDATE" && body.matchedProductId === null) {
    return NextResponse.json(
      { error: "Price update requires a matched product." },
      { status: 400 },
    );
  }

  let price: number | undefined;
  if (body.price !== undefined) {
    const parsed = parseBuyPrice(body.price);
    if (parsed === null) {
      return NextResponse.json({ error: "Valid price is required." }, { status: 400 });
    }
    price = parsed;
  }

  if (body.rawName !== undefined && body.rawName.trim() === "") {
    return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }

  const updated = await prisma.catalogLine.update({
    where: { id: line.id },
    data: {
      action: body.action ?? line.action,
      matchedProductId:
        body.matchedProductId === undefined
          ? line.matchedProductId
          : body.matchedProductId,
      rawName: body.rawName !== undefined ? body.rawName.trim() : line.rawName,
      sku: body.sku !== undefined ? body.sku : line.sku,
      unit: body.unit !== undefined ? body.unit : line.unit,
      price: price !== undefined ? price : line.price,
    },
  });

  return NextResponse.json({
    id: updated.id,
    rawName: updated.rawName,
    sku: updated.sku,
    unit: updated.unit,
    price: Number(updated.price),
    action: updated.action,
    matchedProductId: updated.matchedProductId,
  });
}
