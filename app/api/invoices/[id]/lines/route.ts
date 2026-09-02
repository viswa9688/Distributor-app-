import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (invoice.status !== "REVIEW") {
    return NextResponse.json(
      { error: "Confirmed invoices cannot be edited." },
      { status: 400 },
    );
  }

  const body = (await request.json()) as {
    lineId?: string;
    productId?: string | null;
  };
  if (!body.lineId) {
    return NextResponse.json({ error: "lineId is required." }, { status: 400 });
  }

  const line = await prisma.invoiceLine.findFirst({
    where: { id: body.lineId, invoiceId: id },
  });
  if (!line) {
    return NextResponse.json({ error: "Line not found." }, { status: 404 });
  }

  let productId: string | null;
  if (body.productId === undefined) {
    productId = line.productId;
  } else if (body.productId === null || body.productId === "") {
    productId = null;
  } else {
    const product = await prisma.product.findFirst({
      where: { id: body.productId, manufacturerId: invoice.manufacturerId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found for this manufacturer." },
        { status: 400 },
      );
    }
    productId = product.id;
  }

  const updated = await prisma.invoiceLine.update({
    where: { id: line.id },
    data: { productId },
  });

  return NextResponse.json({
    id: updated.id,
    productId: updated.productId,
  });
}
