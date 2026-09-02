import { prisma } from "@/lib/prisma";
import { extractCatalogFromPdf } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export async function downloadCatalogPdf(filePath: string): Promise<Buffer> {
  const supabase = await createClient();
  const { data: file, error } = await supabase.storage
    .from("catalogs")
    .download(filePath);
  if (error || !file) {
    throw new Error(error?.message ?? "Could not download the PDF.");
  }
  return Buffer.from(await file.arrayBuffer());
}

/** OCR only — for manufacturer name suggestion before creating a manufacturer. */
export async function suggestManufacturerNameFromPdf(filePath: string): Promise<string | null> {
  const pdfBytes = await downloadCatalogPdf(filePath);
  const extracted = await extractCatalogFromPdf(pdfBytes);
  return extracted.manufacturerName;
}
