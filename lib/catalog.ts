import { prisma } from "@/lib/prisma";
import { extractCatalogFromPdf } from "@/lib/gemini";
import {
  catalogActionFor,
  matchProduct,
  parseIdentity,
  type ProductCandidate,
} from "@/lib/product-match";
import { createClient } from "@/lib/supabase/server";
import type { CatalogLineAction, Prisma } from "@prisma/client";

export async function processCatalogImport(importId: string) {
  const catalog = await prisma.catalogImport.findUnique({
    where: { id: importId },
  });
  if (!catalog) {
    throw new Error("Catalog not found.");
  }

  await prisma.catalogImport.update({
    where: { id: importId },
    data: { status: "PROCESSING", error: null },
  });

  try {
    const supabase = await createClient();
    const { data: file, error } = await supabase.storage
      .from("catalogs")
      .download(catalog.filePath);
    if (error || !file) {
      throw new Error(error?.message ?? "Could not download the PDF.");
    }

    const pdfBytes = Buffer.from(await file.arrayBuffer());
    const extracted = await extractCatalogFromPdf(pdfBytes);
    if (extracted.products.length === 0) {
      throw new Error(
        "No products with prices were found. Check that the PDF has a price list.",
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

    await prisma.$transaction(async (tx) => {
      await tx.catalogLine.deleteMany({ where: { catalogImportId: importId } });
      await tx.extraCharge.deleteMany({ where: { catalogImportId: importId } });

      for (const row of extracted.products) {
        const match = matchProduct(row.name, candidates, row.sku);
        const action = catalogActionFor(match);
        await tx.catalogLine.create({
          data: {
            catalogImportId: importId,
            rawName: row.name,
            sku: row.sku,
            unit: row.unit,
            price: row.price,
            matchedProductId: match.selectedProductId,
            action: action as CatalogLineAction,
            matchConfidence: match.confidence,
            matchCandidates: match.candidates.map((c) => ({
              productId: c.productId,
              name: c.name,
              score: c.score,
            })),
          },
        });
      }

      for (const charge of extracted.extraCharges) {
        await tx.extraCharge.create({
          data: {
            catalogImportId: importId,
            name: charge.name,
            amount: charge.amount ?? undefined,
            percent: charge.percent ?? undefined,
          },
        });
      }

      await tx.catalogImport.update({
        where: { id: importId },
        data: { status: "REVIEW", error: null },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog OCR failed.";
    await prisma.catalogImport.update({
      where: { id: importId },
      data: { status: "FAILED", error: message },
    });
    throw err;
  }
}

export async function applyCatalogImport(importId: string) {
  const catalog = await prisma.catalogImport.findUnique({
    where: { id: importId },
    include: { lines: true, extraCharges: true },
  });
  if (!catalog) {
    throw new Error("Catalog not found.");
  }
  if (catalog.status === "APPLIED") {
    throw new Error("This catalog is already applied.");
  }
  if (catalog.status !== "REVIEW") {
    throw new Error("Catalog is not ready to apply.");
  }

  const uncertain = catalog.lines.filter((l) => l.action === "UNCERTAIN");
  if (uncertain.length > 0) {
    throw new Error(
      `Resolve ${uncertain.length} uncertain row(s) before applying.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const line of catalog.lines) {
      if (line.action === "SKIP") continue;

      if (line.action === "CREATE") {
        const parsed = parseIdentity(line.rawName, line.sku);
        const product = await tx.product.create({
          data: {
            name: line.rawName,
            sku: line.sku,
            unit: line.unit,
            currentBuyPrice: line.price,
            normalizedName:
              parsed.normalizedName.length > 0
                ? parsed.normalizedName
                : line.rawName.toLowerCase(),
            sizeValue: parsed.size?.value,
            sizeUnit: parsed.size?.unit,
          },
        });
        await tx.priceHistory.create({
          data: {
            productId: product.id,
            kind: "BUY",
            price: line.price,
            sourceType: "CATALOG",
            sourceId: catalog.id,
          },
        });
        continue;
      }

      if (line.action === "UPDATE") {
        if (!line.matchedProductId) {
          throw new Error(
            `Row “${line.rawName}” is set to update but has no matched product.`,
          );
        }
        const updates: Prisma.ProductUpdateInput = {
          currentBuyPrice: line.price,
        };
        await tx.product.update({
          where: { id: line.matchedProductId },
          data: updates,
        });
        await tx.priceHistory.create({
          data: {
            productId: line.matchedProductId,
            kind: "BUY",
            price: line.price,
            sourceType: "CATALOG",
            sourceId: catalog.id,
          },
        });
      }
    }

    await tx.catalogImport.update({
      where: { id: importId },
      data: { status: "APPLIED", error: null },
    });
  });
}
