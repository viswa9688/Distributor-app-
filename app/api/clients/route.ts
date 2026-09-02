import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { quotes: true } },
    },
  });

  return NextResponse.json(
    clients.map((c) => ({
      id: c.id,
      name: c.name,
      quoteCount: c._count.quotes,
    })),
  );
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: { name },
    select: { id: true, name: true },
  });
  return NextResponse.json(client);
}
