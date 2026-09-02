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
  manufacturerName: string | null;
  priceListPages: number[];
  extraCharges: ExtractedExtraCharge[];
  products: ExtractedCatalogProduct[];
};

const PROMPT = `You are reading a manufacturer product catalog PDF for a distributor.

Ignore marketing copy, photos, and anything that is not a sellable SKU with a price.
Find the price-list pages yourself. Extra charges (freight, GST, handling, etc.) are usually on the last page.

Return:
- manufacturerName: company or brand name on the catalog header if visible, else empty string
- priceListPages: 1-based page numbers that contain the price list
- products: every product on those pages with name, optional sku, optional unit, and unit price as a number
- extraCharges: named extra charges with either a money amount or a percent (not both required)

Do not invent products. If a row has no price, skip it.`;

const catalogSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    manufacturerName: { type: SchemaType.STRING },
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
  required: ["manufacturerName", "priceListPages", "extraCharges", "products"],
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
    model: "gemini-3.6-flash",
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
  const parsed = JSON.parse(text) as ExtractedCatalog & { manufacturerName?: string };
  const manufacturerName = String(parsed.manufacturerName ?? "").trim();
  return {
    manufacturerName: manufacturerName.length > 0 ? manufacturerName : null,
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

export type ExtractedInvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ExtractedInvoice = {
  retailerName: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  lines: ExtractedInvoiceLine[];
};

const INVOICE_PROMPT = `You are reading a retailer invoice photo for a distributor (sale to a shop).

The photo may be printed or handwritten. Extract only line items with a product description and a unit price.

Return:
- retailerName: shop or retailer name if visible, else empty string
- invoiceNumber: if visible
- invoiceDate: YYYY-MM-DD if a date is visible, else null
- lines: each with description, quantity (default 1), unitPrice, lineTotal (quantity * unitPrice if missing)

Do not invent products. Skip rows with no price. Do not create catalog SKUs.`;

const invoiceSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    retailerName: { type: SchemaType.STRING },
    invoiceNumber: { type: SchemaType.STRING, nullable: true },
    invoiceDate: { type: SchemaType.STRING, nullable: true },
    lines: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unitPrice: { type: SchemaType.NUMBER },
          lineTotal: { type: SchemaType.NUMBER },
        },
        required: ["description", "unitPrice"],
      },
    },
  },
  required: ["retailerName", "lines"],
};

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function extractInvoiceFromImage(
  imageBytes: Buffer,
  mimeType: string,
): Promise<ExtractedInvoice> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env and restart.");
  }

  const mime = IMAGE_MIME.has(mimeType) ? mimeType : "image/jpeg";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: invoiceSchema,
    },
  });

  const result = await model.generateContent([
    { text: INVOICE_PROMPT },
    {
      inlineData: {
        mimeType: mime,
        data: imageBytes.toString("base64"),
      },
    },
  ]);

  const text = result.response.text();
  const parsed = JSON.parse(text) as ExtractedInvoice;
  const lines = (parsed.lines ?? [])
    .map((line) => {
      const quantity = Number.isFinite(Number(line.quantity)) && Number(line.quantity) > 0
        ? Number(line.quantity)
        : 1;
      const unitPrice = Number(line.unitPrice);
      const lineTotal = Number.isFinite(Number(line.lineTotal))
        ? Number(line.lineTotal)
        : quantity * unitPrice;
      return {
        description: String(line.description ?? "").trim(),
        quantity,
        unitPrice,
        lineTotal,
      };
    })
    .filter(
      (line) =>
        line.description.length > 0 &&
        Number.isFinite(line.unitPrice) &&
        Number.isFinite(line.lineTotal),
    );

  return {
    retailerName: String(parsed.retailerName ?? "").trim(),
    invoiceNumber: parsed.invoiceNumber
      ? String(parsed.invoiceNumber).trim()
      : null,
    invoiceDate: parsed.invoiceDate ? String(parsed.invoiceDate).trim() : null,
    lines,
  };
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
