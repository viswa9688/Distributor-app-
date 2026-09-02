import { parseIdentity } from "@/lib/product-match";
import type { Prisma } from "@prisma/client";

export function parseBuyPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function buildProductFields(
  name: string,
  sku: string | null | undefined,
  unit: string | null | undefined,
  buyPrice: number | Prisma.Decimal,
) {
  const trimmedName = name.trim();
  const parsed = parseIdentity(trimmedName, sku ?? null);
  return {
    name: trimmedName,
    sku: sku?.trim() || null,
    unit: unit?.trim() || null,
    currentBuyPrice: buyPrice,
    normalizedName:
      parsed.normalizedName.length > 0
        ? parsed.normalizedName
        : trimmedName.toLowerCase(),
    sizeValue: parsed.size?.value,
    sizeUnit: parsed.size?.unit,
  };
}
