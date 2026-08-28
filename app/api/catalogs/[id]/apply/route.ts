import { applyCatalogImport } from "@/lib/catalog";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  try {
    await applyCatalogImport(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ id, status: "APPLIED" });
}
