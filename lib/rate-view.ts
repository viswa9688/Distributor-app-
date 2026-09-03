import { lastFivePrices } from "@/lib/price-history";
import { prisma } from "@/lib/prisma";

export type MockableNumber = { value: number; mock: boolean };
export type MockableString = { value: string; mock: boolean };

export type RateHistoryRow = {
  id: string;
  latest: boolean;
  date: MockableString;
  partyName: MockableString;
  qty: MockableNumber;
  rate: MockableNumber;
  discPercent: MockableNumber;
  amount: MockableNumber;
  mockRow: boolean;
};

export type RateView = {
  product: {
    id: string;
    name: string;
    sku: string | null;
    unit: string;
    manufacturerName: string;
  };
  kpis: {
    sales6mQty: MockableNumber;
    purchase1mQty: MockableNumber;
    closingStockQty: MockableNumber;
    purchaseRatePerUnit: MockableNumber;
    closingStockAmount: MockableNumber;
  };
  hero: {
    rate: MockableNumber;
    unitLabel: string;
    sourceLabel: MockableString;
    dateLabel: MockableString;
  };
  purchases: RateHistoryRow[];
  sales: RateHistoryRow[];
};

/** Deterministic 0–1 float from productId + salt. */
function seededUnit(productId: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < productId.length; i++) {
    h ^= productId.charCodeAt(i) * (i + 1);
    h = Math.imul(h ^ (h >>> 16), 2246822507);
  }
  return (h >>> 0) / 4294967296;
}

function seededInt(productId: string, salt: number, min: number, max: number): number {
  const u = seededUnit(productId, salt);
  return min + Math.floor(u * (max - min + 1));
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function daysAgo(productId: string, salt: number, minDays: number, maxDays: number): Date {
  const days = seededInt(productId, salt, minDays, maxDays);
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

const MOCK_PARTIES = [
  "A.V. UNIPACK PRIVATE LIMITED",
  "MAX WELD HOUSE",
  "SOHAM ENTERPRISES",
  "KARNATAKA HARDWARE",
  "METRO TOOLS SUPPLY",
];

function mockParty(productId: string, salt: number): string {
  const idx = seededInt(productId, salt, 0, MOCK_PARTIES.length - 1);
  return MOCK_PARTIES[idx];
}

function padPurchaseRows(
  productId: string,
  manufacturerName: string,
  real: RateHistoryRow[],
  listRate: number,
): RateHistoryRow[] {
  const rows = [...real];
  let salt = 100;
  while (rows.length < 5) {
    const qty = seededInt(productId, salt, 5, 40);
    const rate =
      Math.round(listRate * (0.85 + seededUnit(productId, salt + 1) * 0.2) * 100) /
      100;
    const disc = seededInt(productId, salt + 2, 0, 8);
    const date = daysAgo(productId, salt + 3, 30, 400);
    rows.push({
      id: `mock-buy-${productId}-${rows.length}`,
      latest: false,
      date: { value: formatDateShort(date), mock: true },
      partyName: { value: manufacturerName, mock: true },
      qty: { value: qty, mock: true },
      rate: { value: rate, mock: true },
      discPercent: { value: disc, mock: true },
      amount: { value: Math.round(qty * rate * (1 - disc / 100) * 100) / 100, mock: true },
      mockRow: true,
    });
    salt += 10;
  }
  return rows.slice(0, 5);
}

function padSellRows(
  productId: string,
  listRate: number,
  real: RateHistoryRow[],
): RateHistoryRow[] {
  const rows = [...real];
  let salt = 200;
  while (rows.length < 5) {
    const qty = seededInt(productId, salt, 1, 12);
    const rate =
      Math.round(listRate * (1.05 + seededUnit(productId, salt + 1) * 0.25) * 100) /
      100;
    const disc = seededInt(productId, salt + 2, 0, 5);
    const date = daysAgo(productId, salt + 3, 5, 180);
    rows.push({
      id: `mock-sell-${productId}-${rows.length}`,
      latest: false,
      date: { value: formatDateShort(date), mock: true },
      partyName: { value: mockParty(productId, salt + 4), mock: true },
      qty: { value: qty, mock: true },
      rate: { value: rate, mock: true },
      discPercent: { value: disc, mock: true },
      amount: { value: Math.round(qty * rate * (1 - disc / 100) * 100) / 100, mock: true },
      mockRow: true,
    });
    salt += 10;
  }
  return rows.slice(0, 5);
}

export async function buildRateView(productId: string): Promise<RateView | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      currentBuyPrice: true,
      manufacturer: { select: { id: true, name: true } },
    },
  });
  if (!product) return null;

  const unit = product.unit?.trim() || "NOS";
  const listRate = Number(product.currentBuyPrice);
  const manufacturerName = product.manufacturer.name;

  const [buys, sells] = await Promise.all([
    lastFivePrices(product.id, "BUY"),
    lastFivePrices(product.id, "SELL"),
  ]);

  const latestBuy = buys[0] ?? null;
  let catalogSourceLabel = `${manufacturerName} price list`;
  if (latestBuy?.sourceType === "CATALOG" && latestBuy.sourceId) {
    const catalog = await prisma.catalogImport.findUnique({
      where: { id: latestBuy.sourceId },
      select: { filePath: true, createdAt: true },
    });
    if (catalog) {
      const file = catalog.filePath.split("/").pop() ?? "catalog";
      catalogSourceLabel = `${manufacturerName} · ${file}`;
    }
  }

  const purchaseRows: RateHistoryRow[] = buys.map((row, index) => {
    const rate = Number(row.price);
    const qty = seededInt(product.id, 50 + index, 8, 30);
    const disc = seededInt(product.id, 60 + index, 0, 6);
    return {
      id: row.id,
      latest: index === 0,
      date: { value: formatDateShort(row.recordedAt), mock: false },
      partyName: { value: manufacturerName, mock: false },
      qty: { value: qty, mock: true },
      rate: { value: rate, mock: false },
      discPercent: { value: disc, mock: true },
      amount: {
        value: Math.round(qty * rate * (1 - disc / 100) * 100) / 100,
        mock: true,
      },
      mockRow: false,
    };
  });

  const invoiceIds = sells
    .filter((s) => s.sourceType === "INVOICE")
    .map((s) => s.sourceId);

  const invoices =
    invoiceIds.length > 0
      ? await prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: {
            id: true,
            retailerName: true,
            lines: {
              where: { productId: product.id },
              select: {
                quantity: true,
                unitPrice: true,
                lineTotal: true,
              },
              take: 1,
            },
          },
        })
      : [];
  const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));

  const sellRows: RateHistoryRow[] = sells.map((row, index) => {
    const rate = Number(row.price);
    const inv = row.sourceType === "INVOICE" ? invoiceById.get(row.sourceId) : null;
    const line = inv?.lines[0];
    const qtyReal = line ? Number(line.quantity) : null;
    const amountReal = line ? Number(line.lineTotal) : null;
    const partyReal = inv?.retailerName?.trim() || null;

    const qtyMock = seededInt(product.id, 70 + index, 1, 10);
    const disc = seededInt(product.id, 80 + index, 0, 4);
    const qty = qtyReal ?? qtyMock;
    const amount =
      amountReal ??
      Math.round(qty * rate * (1 - disc / 100) * 100) / 100;

    return {
      id: row.id,
      latest: index === 0,
      date: { value: formatDateShort(row.recordedAt), mock: false },
      partyName: partyReal
        ? { value: partyReal, mock: false }
        : { value: mockParty(product.id, 90 + index), mock: true },
      qty: qtyReal != null ? { value: qtyReal, mock: false } : { value: qtyMock, mock: true },
      rate: { value: rate, mock: false },
      discPercent: { value: disc, mock: true },
      amount:
        amountReal != null
          ? { value: amountReal, mock: false }
          : { value: amount, mock: true },
      mockRow: false,
    };
  });

  const closingQty = seededInt(product.id, 1, 1, 25);
  const sales6m = seededInt(product.id, 2, 10, 80);
  const purchase1m = seededInt(product.id, 3, 0, 20);

  return {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit,
      manufacturerName,
    },
    kpis: {
      sales6mQty: { value: sales6m, mock: true },
      purchase1mQty: { value: purchase1m, mock: true },
      closingStockQty: { value: closingQty, mock: true },
      purchaseRatePerUnit: { value: listRate, mock: false },
      closingStockAmount: {
        value: Math.round(closingQty * listRate * 100) / 100,
        mock: true,
      },
    },
    hero: {
      rate: { value: listRate, mock: false },
      unitLabel: unit,
      sourceLabel: {
        value: `₹${listRate.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${catalogSourceLabel}`,
        mock: false,
      },
      dateLabel: {
        value: latestBuy
          ? formatDateShort(latestBuy.recordedAt)
          : formatDateShort(new Date()),
        mock: !latestBuy,
      },
    },
    purchases: padPurchaseRows(
      product.id,
      manufacturerName,
      purchaseRows,
      listRate,
    ),
    sales: padSellRows(product.id, listRate, sellRows),
  };
}

export async function searchRateProducts(q: string) {
  const query = q.trim();
  if (!query) return [];

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: [{ name: "asc" }],
    take: 20,
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      currentBuyPrice: true,
      manufacturer: { select: { id: true, name: true } },
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    buyPrice: Number(p.currentBuyPrice),
    manufacturer: p.manufacturer,
  }));
}
