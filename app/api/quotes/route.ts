import { prisma } from "@/lib/prisma";
import { quoteDateRange } from "@/lib/quote-cost";
import { buildQuoteLines, sumQuoteLines } from "@/lib/quote";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId")?.trim();
  const preset = searchParams.get("preset")?.trim();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const range = quoteDateRange(preset);
  const from = fromParam ? new Date(fromParam) : range.from;
  const to = toParam ? new Date(toParam) : range.to;

  const quotes = await prisma.salesQuote.findMany({
    where: {
      clientId: clientId || undefined,
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      lines: { select: { lineTotal: true } },
      client: { select: { id: true, name: true } },
    },
    take: 100,
  });

  return NextResponse.json(
    quotes.map((q) => ({
      id: q.id,
      clientId: q.clientId,
      clientName: q.clientName,
      createdAt: q.createdAt.toISOString(),
      grandTotal: sumQuoteLines(
        q.lines.map((l) => ({ lineTotal: Number(l.lineTotal) })),
      ),
    })),
  );
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as {
    clientId?: string;
    lines?: Array<{
      productId?: string;
      quantity?: unknown;
      marginPercent?: unknown;
    }>;
  };

  const clientId = body.clientId?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  try {
    const built = await buildQuoteLines(body.lines ?? []);
    const quote = await prisma.salesQuote.create({
      data: {
        clientId: client.id,
        clientName: client.name,
        createdBy: user.id,
        lines: {
          create: built.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            manufacturerName: line.manufacturerName,
            sku: line.sku,
            unit: line.unit,
            quantity: line.quantity,
            buyPrice: line.buyPrice,
            extraChargesTotal: line.extraChargesTotal,
            baseCost: line.baseCost,
            marginPercent: line.marginPercent,
            unitQuotePrice: line.unitQuotePrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json({
      id: quote.id,
      clientId: quote.clientId,
      clientName: quote.clientName,
      createdAt: quote.createdAt.toISOString(),
      grandTotal: sumQuoteLines(
        quote.lines.map((l) => ({ lineTotal: Number(l.lineTotal) })),
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save quote.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
