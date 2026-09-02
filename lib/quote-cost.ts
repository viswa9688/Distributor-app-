export type ChargeInput = {
  amount?: number | string | null;
  percent?: number | string | null;
};

export function extraChargesTotal(buyPrice: number, charges: ChargeInput[]): number {
  let total = 0;
  for (const charge of charges) {
    const amount = charge.amount != null ? Number(charge.amount) : 0;
    const percent = charge.percent != null ? Number(charge.percent) : 0;
    if (Number.isFinite(amount) && amount > 0) total += amount;
    if (Number.isFinite(percent) && percent > 0) total += buyPrice * (percent / 100);
  }
  return roundMoney(total);
}

export function baseCost(buyPrice: number, charges: ChargeInput[]): number {
  return roundMoney(buyPrice + extraChargesTotal(buyPrice, charges));
}

export function unitQuotePrice(base: number, marginPercent: number): number {
  return roundMoney(base * (1 + marginPercent / 100));
}

export function lineTotal(unitPrice: number, quantity: number): number {
  return roundMoney(unitPrice * quantity);
}

export function quoteGrandTotal(
  lines: { lineTotal: number }[],
): number {
  return roundMoney(lines.reduce((sum, l) => sum + l.lineTotal, 0));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseMarginPercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function parseQuantity(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function quoteDateRange(preset?: string): { from?: Date; to?: Date } {
  if (!preset || preset === "all") return {};
  const now = new Date();
  const to = now;
  const from = new Date(now);
  if (preset === "7d") from.setDate(from.getDate() - 7);
  else if (preset === "30d") from.setDate(from.getDate() - 30);
  else if (preset === "90d") from.setDate(from.getDate() - 90);
  else return {};
  return { from, to };
}
