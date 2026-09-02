import { prisma } from "@/lib/prisma";
import { sumQuoteLines } from "@/lib/quote";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const quote = await prisma.salesQuote.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      lines: { orderBy: { productName: "asc" } },
    },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  const lines = quote.lines.map((l) => ({
    id: l.id,
    productId: l.productId,
    productName: l.productName,
    manufacturerName: l.manufacturerName,
    sku: l.sku,
    unit: l.unit,
    quantity: Number(l.quantity),
    buyPrice: Number(l.buyPrice),
    extraChargesTotal: Number(l.extraChargesTotal),
    baseCost: Number(l.baseCost),
    marginPercent: Number(l.marginPercent),
    unitQuotePrice: Number(l.unitQuotePrice),
    lineTotal: Number(l.lineTotal),
  }));

  return NextResponse.json({
    id: quote.id,
    clientId: quote.clientId,
    clientName: quote.clientName,
    createdAt: quote.createdAt.toISOString(),
    grandTotal: sumQuoteLines(lines),
    lines,
  });
}
