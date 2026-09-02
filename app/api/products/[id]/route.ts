import { prisma, prismaTx } from "@/lib/prisma";
import { buildProductFields, parseBuyPrice } from "@/lib/product";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    sku?: string | null;
    unit?: string | null;
    currentBuyPrice?: unknown;
  };

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const name = body.name !== undefined ? body.name.trim() : product.name;
  if (!name) {
    return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }

  let buyPrice = Number(product.currentBuyPrice);
  if (body.currentBuyPrice !== undefined) {
    const parsed = parseBuyPrice(body.currentBuyPrice);
    if (parsed === null) {
      return NextResponse.json({ error: "Valid buy price is required." }, { status: 400 });
    }
    buyPrice = parsed;
  }

  const sku = body.sku !== undefined ? body.sku : product.sku;
  const unit = body.unit !== undefined ? body.unit : product.unit;
  const fields = buildProductFields(name, sku, unit, buyPrice);
  const priceChanged = buyPrice !== Number(product.currentBuyPrice);

  const updated = await prismaTx.$transaction(async (tx) => {
    const row = await tx.product.update({
      where: { id },
      data: fields,
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        currentBuyPrice: true,
      },
    });
    if (priceChanged) {
      await tx.priceHistory.create({
        data: {
          productId: id,
          kind: "BUY",
          price: buyPrice,
          sourceType: "MANUAL",
          sourceId: id,
        },
      });
    }
    return row;
  });

  return NextResponse.json({
    ...updated,
    currentBuyPrice: Number(updated.currentBuyPrice),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
