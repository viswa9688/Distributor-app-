import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

/** One client, session/direct URL. Pooler (6543) hid Apply writes from the Products list. */
export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
