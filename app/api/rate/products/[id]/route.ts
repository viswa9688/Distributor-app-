import { buildRateView } from "@/lib/rate-view";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await context.params;
  const view = await buildRateView(id);
  if (!view) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json(view);
}
