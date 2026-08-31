import { prisma } from "@/lib/prisma";
import { extractCatalogFromPdf } from "@/lib/gemini";
import {
  catalogActionFor,
  matchProduct,
  parseIdentity,
  type ProductCandidate,
} from "@/lib/product-match";
import { createClient } from "@/lib/supabase/server";
import type { CatalogLineAction } from "@prisma/client";

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

    const lines = extracted.products.map((row) => {
      const match = matchProduct(row.name, candidates, row.sku);
      const action = catalogActionFor(match);
      return {
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
      };
    });
    const charges = extracted.extraCharges.map((charge) => ({
      catalogImportId: importId,
      name: charge.name,
      amount: charge.amount ?? undefined,
      percent: charge.percent ?? undefined,
    }));

    await prisma.$transaction(
      async (tx) => {
        await tx.catalogLine.deleteMany({ where: { catalogImportId: importId } });
        await tx.extraCharge.deleteMany({ where: { catalogImportId: importId } });
        if (lines.length > 0) {
          await tx.catalogLine.createMany({ data: lines });
        }
        if (charges.length > 0) {
          await tx.extraCharge.createMany({ data: charges });
        }
        await tx.catalogImport.update({
          where: { id: importId },
          data: { status: "REVIEW", error: null },
        });
      },
      { maxWait: 15_000, timeout: 60_000 },
    );
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

  await prisma.$transaction(
    async (tx) => {
      const creates = catalog.lines.filter((l) => l.action === "CREATE");
      const updates = catalog.lines.filter((l) => l.action === "UPDATE");

      if (creates.length > 0) {
        const created = await tx.product.createManyAndReturn({
          data: creates.map((line) => {
            const parsed = parseIdentity(line.rawName, line.sku);
            return {
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
            };
          }),
        });
        await tx.priceHistory.createMany({
          data: created.map((product, i) => ({
            productId: product.id,
            kind: "BUY" as const,
            price: creates[i].price,
            sourceType: "CATALOG" as const,
            sourceId: catalog.id,
          })),
        });
      }

      for (const line of updates) {
        if (!line.matchedProductId) {
          throw new Error(
            `Row “${line.rawName}” is set to update but has no matched product.`,
          );
        }
        await tx.product.update({
          where: { id: line.matchedProductId },
          data: { currentBuyPrice: line.price },
        });
      }
      if (updates.length > 0) {
        await tx.priceHistory.createMany({
          data: updates.map((line) => ({
            productId: line.matchedProductId as string,
            kind: "BUY" as const,
            price: line.price,
            sourceType: "CATALOG" as const,
            sourceId: catalog.id,
          })),
        });
      }

      await tx.catalogImport.update({
        where: { id: importId },
        data: { status: "APPLIED", error: null },
      });
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
}
