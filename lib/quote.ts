import { prisma } from "@/lib/prisma";
import {
  baseCost,
  extraChargesTotal,
  lineTotal,
  parseQuantity,
} from "@/lib/quote-cost";

type LineInput = {
  productId?: string;
  quantity?: unknown;
  marginPercent?: unknown;
};

export async function buildQuoteLines(inputs: LineInput[]) {
  if (inputs.length === 0) {
    throw new Error("Add at least one product to the quote.");
  }

  const productIds = inputs.map((l) => l.productId).filter(Boolean) as string[];
  if (productIds.length !== inputs.length) {
    throw new Error("Each line needs a productId.");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      manufacturer: { select: { name: true } },
      extraCharges: {
        select: { amount: true, percent: true },
      },
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = [];

  for (const input of inputs) {
    const product = byId.get(input.productId!);
    if (!product) {
      throw new Error("Product not found.");
    }

    const quantity = parseQuantity(input.quantity) ?? 1;
    const marginPercent = 0;

    const buyPrice = Number(product.currentBuyPrice);
    const charges = product.extraCharges.map((c) => ({
      amount: c.amount != null ? Number(c.amount) : null,
      percent: c.percent != null ? Number(c.percent) : null,
    }));
    const chargesTotal = extraChargesTotal(buyPrice, charges);
    const cost = baseCost(buyPrice, charges);
    const total = lineTotal(cost, quantity);

    lines.push({
      productId: product.id,
      productName: product.name,
      manufacturerName: product.manufacturer.name,
      sku: product.sku,
      unit: product.unit,
      quantity,
      buyPrice,
      extraChargesTotal: chargesTotal,
      baseCost: cost,
      marginPercent,
      unitQuotePrice: cost,
      lineTotal: total,
    });
  }

  return lines;
}

export function sumQuoteLines(lines: { lineTotal: number }[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}
