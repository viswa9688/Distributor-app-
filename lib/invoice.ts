import { prisma } from "@/lib/prisma";
import { extractInvoiceFromImage } from "@/lib/gemini";
import { matchProduct, type ProductCandidate } from "@/lib/product-match";
import { createClient } from "@/lib/supabase/server";
import type { MatchConfidence } from "@prisma/client";

function parseInvoiceDate(value: string | null): Date | null {
  if (!value) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0];
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mimeFromPath(filePath: string, header: string | undefined): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (header && header.startsWith("image/")) return header;
  return "image/jpeg";
}

export async function createInvoiceFromUpload(
  filePath: string,
  createdBy: string,
) {
  const supabase = await createClient();
  const { data: file, error } = await supabase.storage
    .from("invoices")
    .download(filePath);
  if (error || !file) {
    throw new Error(error?.message ?? "Could not download the invoice photo.");
  }

  const imageBytes = Buffer.from(await file.arrayBuffer());
  const extracted = await extractInvoiceFromImage(
    imageBytes,
    mimeFromPath(filePath, file.type),
  );
  if (extracted.lines.length === 0) {
    throw new Error(
      "No line items with prices were found. Try a clearer photo.",
    );
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      normalizedName: true,
      sizeValue: true,
      sizeUnit: true,
    },
  });
  const candidates: ProductCandidate[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    normalizedName: p.normalizedName,
    sizeValue: p.sizeValue ? Number(p.sizeValue) : null,
    sizeUnit: p.sizeUnit,
  }));

  const invoice = await prisma.$transaction(
    async (tx) => {
      const created = await tx.invoice.create({
        data: {
          retailerName:
            extracted.retailerName.length > 0
              ? extracted.retailerName
              : "Unknown retailer",
          invoiceNumber: extracted.invoiceNumber,
          invoiceDate: parseInvoiceDate(extracted.invoiceDate),
          imagePath: filePath,
          status: "REVIEW",
          createdBy,
        },
      });

      await tx.invoiceLine.createMany({
        data: extracted.lines.map((line) => {
          const match = matchProduct(line.description, candidates);
          return {
            invoiceId: created.id,
            productId: match.selectedProductId,
            rawDescription: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            matchConfidence: match.confidence as MatchConfidence,
            matchCandidates: match.candidates.map((c) => ({
              productId: c.productId,
              name: c.name,
              score: c.score,
            })),
          };
        }),
      });

      return created;
    },
    { maxWait: 15_000, timeout: 60_000 },
  );

  return invoice;
}

export async function confirmInvoice(
  invoiceId: string,
  retailerName?: string,
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found.");
  }
  if (invoice.status === "CONFIRMED") {
    throw new Error("This invoice is already confirmed.");
  }

  const name = retailerName?.trim();

  await prisma.$transaction(
    async (tx) => {
      const matched = invoice.lines.filter((line) => line.productId);
      if (matched.length > 0) {
        await tx.priceHistory.createMany({
          data: matched.map((line) => ({
            productId: line.productId as string,
            kind: "SELL" as const,
            price: line.unitPrice,
            sourceType: "INVOICE" as const,
            sourceId: invoice.id,
          })),
        });
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "CONFIRMED",
          retailerName: name && name.length > 0 ? name : invoice.retailerName,
        },
      });
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
}
