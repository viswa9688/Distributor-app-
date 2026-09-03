import { prisma } from "@/lib/prisma";
import type { PriceKind } from "@prisma/client";

/** Last-5 is a read LIMIT. Never delete PriceHistory rows to “keep five”. */
export async function lastFivePrices(productId: string, kind: PriceKind) {
  return prisma.priceHistory.findMany({
    where: { productId, kind },
    orderBy: { recordedAt: "desc" },
    take: 5,
    select: {
      id: true,
      price: true,
      recordedAt: true,
      sourceType: true,
      sourceId: true,
    },
  });
}
