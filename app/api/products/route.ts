import { prisma, prismaTx } from "@/lib/prisma";
import { buildProductFields, parseBuyPrice } from "@/lib/product";
import { copyProductExtraChargesFromManufacturer } from "@/lib/extra-charges";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as {
    manufacturerId?: string;
    name?: string;
    sku?: string | null;
    unit?: string | null;
    currentBuyPrice?: unknown;
  };

  const manufacturerId = body.manufacturerId?.trim();
  const name = body.name?.trim();
  const buyPrice = parseBuyPrice(body.currentBuyPrice);

  if (!manufacturerId || !name) {
    return NextResponse.json(
      { error: "manufacturerId and name are required." },
      { status: 400 },
    );
  }
  if (buyPrice === null) {
    return NextResponse.json({ error: "Valid buy price is required." }, { status: 400 });
  }

  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id: manufacturerId },
    select: { id: true },
  });
  if (!manufacturer) {
    return NextResponse.json({ error: "Manufacturer not found." }, { status: 404 });
  }

  const fields = buildProductFields(name, body.sku, body.unit, buyPrice);

  const product = await prismaTx.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: { manufacturerId, ...fields },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        currentBuyPrice: true,
      },
    });
    await tx.priceHistory.create({
      data: {
        productId: created.id,
        kind: "BUY",
        price: buyPrice,
        sourceType: "MANUAL",
        sourceId: created.id,
      },
    });
    await copyProductExtraChargesFromManufacturer(tx, manufacturerId, created.id);
    return created;
  });

  return NextResponse.json({
    ...product,
    currentBuyPrice: Number(product.currentBuyPrice),
  });
}
