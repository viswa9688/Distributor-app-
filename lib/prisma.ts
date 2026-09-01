import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaTx?: PrismaClient;
};

const pooledUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL ?? pooledUrl;

/** Pooled URL for page reads (faster on Vercel). */
export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  pooledUrl || directUrl
    ? { datasources: { db: { url: pooledUrl ?? directUrl } } }
    : undefined,
);

/** Direct/session URL for interactive transactions (PgBouncer 6543 cannot hold them). */
export const prismaTx =
  globalForPrisma.prismaTx ??
  new PrismaClient(
    directUrl ? { datasources: { db: { url: directUrl } } } : undefined,
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaTx = prismaTx;
}
