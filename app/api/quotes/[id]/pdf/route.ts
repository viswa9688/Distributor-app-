import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatQuoteDate, formatQuoteTime } from "@/lib/format-datetime";
import { prisma } from "@/lib/prisma";
import { sumQuoteLines } from "@/lib/quote";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

function formatMoney(n: number) {
  return n.toFixed(2);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const quote = await prisma.salesQuote.findUnique({
    where: { id },
    include: { lines: { orderBy: { productName: "asc" } } },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  const lines = quote.lines.map((l) => ({
    productName: l.productName,
    manufacturerName: l.manufacturerName,
    sku: l.sku,
    unit: l.unit,
    quantity: Number(l.quantity),
    baseCost: Number(l.baseCost),
    lineTotal: Number(l.lineTotal),
  }));
  const grandTotal = sumQuoteLines(lines);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595;
  const pageHeight = 842;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 50;

  const draw = (text: string, x: number, size = 10, bold = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  draw("Sales quote", 50, 18, true);
  y -= 28;
  draw(`Client: ${quote.clientName}`, 50, 11);
  y -= 16;
  draw(`Date created: ${formatQuoteDate(quote.createdAt)}`, 50, 10);
  y -= 14;
  draw(`Time created: ${formatQuoteTime(quote.createdAt)}`, 50, 10);
  y -= 24;

  draw("Product", 50, 9, true);
  draw("Qty", 340, 9, true);
  draw("Unit cost", 400, 9, true);
  draw("Total", 500, 9, true);
  y -= 14;

  for (const line of lines) {
    if (y < 80) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;
    }
    const label = line.sku
      ? `${line.productName} (${line.sku})`
      : line.productName;
    const short =
      label.length > 40 ? `${label.slice(0, 39)}…` : label;
    draw(short, 50, 9);
    draw(String(line.quantity), 340, 9);
    draw(formatMoney(line.baseCost), 400, 9);
    draw(formatMoney(line.lineTotal), 500, 9);
    y -= 14;
    draw(line.manufacturerName, 50, 8);
    y -= 12;
  }

  y -= 8;
  draw(`Grand total: ${formatMoney(grandTotal)}`, 50, 12, true);

  const bytes = await pdf.save();
  const filename = `quote-${quote.clientName.replace(/\s+/g, "-")}-${quote.id.slice(0, 8)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
