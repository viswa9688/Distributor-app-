import { prisma } from "@/lib/prisma";
import { baseCost } from "@/lib/quote-cost";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const products = await prisma.product.findMany({
    orderBy: [{ manufacturer: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      currentBuyPrice: true,
      manufacturer: { select: { id: true, name: true } },
      extraCharges: {
        select: { amount: true, percent: true },
      },
    },
  });

  return NextResponse.json(
    products.map((p) => {
      const buyPrice = Number(p.currentBuyPrice);
      const charges = p.extraCharges.map((c) => ({
        amount: c.amount != null ? Number(c.amount) : null,
        percent: c.percent != null ? Number(c.percent) : null,
      }));
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        buyPrice,
        baseCost: baseCost(buyPrice, charges),
        manufacturer: p.manufacturer,
      };
    }),
  );
}
