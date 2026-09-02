import { createInvoiceFromUpload } from "@/lib/invoice";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as {
    filePath?: string;
    manufacturerId?: string;
  };
  const filePath = body.filePath?.trim();
  const manufacturerId = body.manufacturerId?.trim();

  if (!filePath) {
    return NextResponse.json({ error: "filePath is required." }, { status: 400 });
  }
  if (!manufacturerId) {
    return NextResponse.json(
      { error: "Select a manufacturer before scanning." },
      { status: 400 },
    );
  }

  try {
    const invoice = await createInvoiceFromUpload(
      filePath,
      manufacturerId,
      user.id,
    );
    return NextResponse.json({ id: invoice.id, status: invoice.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invoice OCR failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
