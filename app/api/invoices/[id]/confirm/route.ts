import { confirmInvoice } from "@/lib/invoice";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    retailerName?: string;
  };

  try {
    await confirmInvoice(id, body.retailerName);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirm failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ id, status: "CONFIRMED" });
}
