import { searchRateProducts } from "@/lib/rate-view";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const products = await searchRateProducts(q);
  return NextResponse.json(products);
}
