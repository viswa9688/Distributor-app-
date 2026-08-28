import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

export type ExtractedCatalogProduct = {
  name: string;
  sku: string | null;
  unit: string | null;
  price: number;
};

export type ExtractedExtraCharge = {
  name: string;
  amount: number | null;
  percent: number | null;
};

export type ExtractedCatalog = {
  priceListPages: number[];
  extraCharges: ExtractedExtraCharge[];
  products: ExtractedCatalogProduct[];
};

const PROMPT = `You are reading a manufacturer product catalog PDF for a distributor.

Ignore marketing copy, photos, and anything that is not a sellable SKU with a price.
Find the price-list pages yourself. Extra charges (freight, GST, handling, etc.) are usually on the last page.

Return:
- priceListPages: 1-based page numbers that contain the price list
- products: every product on those pages with name, optional sku, optional unit, and unit price as a number
- extraCharges: named extra charges with either a money amount or a percent (not both required)

Do not invent products. If a row has no price, skip it.`;

const catalogSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    priceListPages: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.INTEGER },
    },
    extraCharges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          amount: { type: SchemaType.NUMBER, nullable: true },
          percent: { type: SchemaType.NUMBER, nullable: true },
        },
        required: ["name"],
      },
    },
    products: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          sku: { type: SchemaType.STRING, nullable: true },
          unit: { type: SchemaType.STRING, nullable: true },
          price: { type: SchemaType.NUMBER },
        },
        required: ["name", "price"],
      },
    },
  },
  required: ["priceListPages", "extraCharges", "products"],
};

export async function extractCatalogFromPdf(
  pdfBytes: Buffer,
): Promise<ExtractedCatalog> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env and restart.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: catalogSchema,
    },
  });

  const result = await model.generateContent([
    { text: PROMPT },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBytes.toString("base64"),
      },
    },
  ]);

  const text = result.response.text();
  const parsed = JSON.parse(text) as ExtractedCatalog;
  return {
    priceListPages: Array.isArray(parsed.priceListPages)
      ? parsed.priceListPages
      : [],
    extraCharges: (parsed.extraCharges ?? []).map((c) => ({
      name: String(c.name ?? "").trim(),
      amount: toNum(c.amount),
      percent: toNum(c.percent),
    })).filter((c) => c.name.length > 0),
    products: (parsed.products ?? [])
      .map((p) => ({
        name: String(p.name ?? "").trim(),
        sku: p.sku ? String(p.sku).trim() : null,
        unit: p.unit ? String(p.unit).trim() : null,
        price: Number(p.price),
      }))
      .filter((p) => p.name.length > 0 && Number.isFinite(p.price)),
  };
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
