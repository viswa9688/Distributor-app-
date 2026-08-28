export type SizeUnit = "g" | "kg" | "ml" | "l" | "pcs";

export type ProductSize = {
  value: number;
  unit: SizeUnit;
};

export type ParsedIdentity = {
  raw: string;
  normalizedName: string;
  tokens: string[];
  size: ProductSize | null;
  sku: string | null;
};

export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type CatalogAction = "CREATE" | "UPDATE" | "UNCERTAIN";

export type ProductCandidate = {
  id: string;
  name: string;
  sku?: string | null;
  normalizedName?: string | null;
  sizeValue?: number | string | null;
  sizeUnit?: string | null;
};

export type MatchHit = {
  productId: string;
  name: string;
  score: number;
  confidence: MatchConfidence;
};

export type MatchResult = {
  /** Set only for HIGH. Review UI may still override. */
  selectedProductId: string | null;
  confidence: MatchConfidence;
  candidates: MatchHit[];
};

const FILLER = new Set([
  "detergent",
  "powder",
  "pack",
  "packet",
  "refill",
]);

const UNIT_CANON: Record<string, SizeUnit> = {
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilogram: "kg",
  kilograms: "kg",
  g: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  l: "l",
  ltr: "l",
  ltrs: "l",
  litre: "l",
  liter: "l",
  litres: "l",
  liters: "l",
  ml: "ml",
  millilitre: "ml",
  milliliter: "ml",
  millilitres: "ml",
  milliliters: "ml",
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
};

const SIZE_RE =
  /(\d+(?:\.\d+)?)\s*(kilograms?|kgs?|kilo|millilitres?|milliliters?|grams?|gms|gm|litres?|liters?|ltrs?|ltr|pieces?|pcs|pc|ml|kg|g|l)\b/i;

const HIGH_MIN = 0.9;
const MEDIUM_MIN = 0.65;
const CONTAINMENT_BONUS = 0.15;

export function normalizeSku(sku: string | null | undefined): string | null {
  if (!sku) return null;
  const trimmed = sku.normalize("NFKC").trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

export function parseIdentity(
  text: string,
  sku?: string | null,
): ParsedIdentity {
  const raw = text ?? "";
  const canonical = canonicalize(raw);
  const { withoutSize, size } = extractSize(canonical);
  const tokens = withoutSize
    .split(/\s+/)
    .filter((t) => t.length > 0 && !FILLER.has(t));
  return {
    raw,
    normalizedName: tokens.join(" "),
    tokens,
    size,
    sku: normalizeSku(sku),
  };
}

export function matchProduct(
  queryText: string,
  products: ProductCandidate[],
  querySku?: string | null,
): MatchResult {
  const query = parseIdentity(queryText, querySku);
  if (isBlankQuery(query)) {
    return { selectedProductId: null, confidence: "NONE", candidates: [] };
  }
  if (products.length === 0) {
    return { selectedProductId: null, confidence: "NONE", candidates: [] };
  }

  const scored: MatchHit[] = [];
  for (const product of products) {
    const hit = scoreCandidate(query, product);
    if (hit) scored.push(hit);
  }

  scored.sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, 3);
  const top = candidates[0];

  if (!top) {
    return { selectedProductId: null, confidence: "NONE", candidates: [] };
  }

  const confidence = bandFor(top.score);
  return {
    selectedProductId: confidence === "HIGH" ? top.productId : null,
    confidence,
    candidates,
  };
}

/** First catalog (empty products) → CREATE. HIGH → UPDATE. MEDIUM → user decides. */
export function catalogActionFor(result: MatchResult): CatalogAction {
  if (result.confidence === "HIGH" && result.selectedProductId) {
    return "UPDATE";
  }
  if (result.confidence === "MEDIUM") {
    return "UNCERTAIN";
  }
  return "CREATE";
}

export function sizesCompatible(
  a: ProductSize | null,
  b: ProductSize | null,
): boolean {
  if (!a || !b) return true;
  const ca = canonicalAmount(a);
  const cb = canonicalAmount(b);
  if (ca.kind !== cb.kind) return false;
  return Math.abs(ca.amount - cb.amount) < 0.0001;
}

function canonicalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSize(canonical: string): {
  withoutSize: string;
  size: ProductSize | null;
} {
  const match = canonical.match(SIZE_RE);
  if (!match) {
    return { withoutSize: canonical, size: null };
  }
  const value = Number(match[1]);
  const unit = UNIT_CANON[match[2].toLowerCase()];
  if (!Number.isFinite(value) || !unit) {
    return { withoutSize: canonical, size: null };
  }
  const withoutSize = `${canonical.slice(0, match.index)}${canonical.slice(
    (match.index ?? 0) + match[0].length,
  )}`
    .replace(/\s+/g, " ")
    .trim();
  return { withoutSize, size: { value, unit } };
}

function canonicalAmount(size: ProductSize): {
  kind: "mass" | "volume" | "count";
  amount: number;
} {
  switch (size.unit) {
    case "kg":
      return { kind: "mass", amount: size.value * 1000 };
    case "g":
      return { kind: "mass", amount: size.value };
    case "l":
      return { kind: "volume", amount: size.value * 1000 };
    case "ml":
      return { kind: "volume", amount: size.value };
    case "pcs":
      return { kind: "count", amount: size.value };
  }
}

function isBlankQuery(query: ParsedIdentity): boolean {
  return (
    query.normalizedName.length === 0 &&
    query.sku === null &&
    query.size === null
  );
}

function identityForProduct(product: ProductCandidate): ParsedIdentity {
  if (product.normalizedName && product.normalizedName.length > 0) {
    const size = sizeFromStored(product.sizeValue, product.sizeUnit);
    return {
      raw: product.name,
      normalizedName: product.normalizedName,
      tokens: product.normalizedName.split(/\s+/).filter(Boolean),
      size,
      sku: normalizeSku(product.sku),
    };
  }
  return parseIdentity(product.name, product.sku);
}

function sizeFromStored(
  value: number | string | null | undefined,
  unit: string | null | undefined,
): ProductSize | null {
  if (value === null || value === undefined || !unit) return null;
  const n = typeof value === "number" ? value : Number(value);
  const canon = UNIT_CANON[unit.toLowerCase()];
  if (!Number.isFinite(n) || !canon) return null;
  return { value: n, unit: canon };
}

function scoreCandidate(
  query: ParsedIdentity,
  product: ProductCandidate,
): MatchHit | null {
  const target = identityForProduct(product);
  if (!sizesCompatible(query.size, target.size)) {
    return null;
  }

  if (query.sku && target.sku && query.sku === target.sku) {
    return hit(product, 1, "HIGH");
  }

  if (
    query.normalizedName.length > 0 &&
    query.normalizedName === target.normalizedName
  ) {
    return hit(product, 1, "HIGH");
  }

  const dice = tokenDice(query.tokens, target.tokens);
  const contained = isContained(query.normalizedName, target.normalizedName);
  const score = Math.min(1, dice + (contained ? CONTAINMENT_BONUS : 0));
  if (score <= 0) return null;
  return hit(product, score, bandFor(score));
}

function hit(
  product: ProductCandidate,
  score: number,
  confidence: MatchConfidence,
): MatchHit {
  return {
    productId: product.id,
    name: product.name,
    score,
    confidence,
  };
}

function bandFor(score: number): MatchConfidence {
  if (score >= HIGH_MIN) return "HIGH";
  if (score >= MEDIUM_MIN) return "MEDIUM";
  if (score > 0) return "LOW";
  return "NONE";
}

function tokenDice(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const bSet = new Set(b);
  let overlap = 0;
  const seen = new Set<string>();
  for (const token of a) {
    if (bSet.has(token) && !seen.has(token)) {
      overlap += 1;
      seen.add(token);
    }
  }
  return (2 * overlap) / (a.length + b.length);
}

function isContained(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return ` ${longer} `.includes(` ${shorter} `);
}
