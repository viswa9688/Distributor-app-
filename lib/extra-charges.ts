import type { Prisma } from "@prisma/client";

export type ExtraChargeInput = {
  name: string;
  amount?: Prisma.Decimal | number | null;
  percent?: Prisma.Decimal | number | null;
};

type Tx = Prisma.TransactionClient;

export async function syncManufacturerProductExtraCharges(
  tx: Tx,
  manufacturerId: string,
  catalogImportId: string,
  charges: ExtraChargeInput[],
) {
  const products = await tx.product.findMany({
    where: { manufacturerId },
    select: { id: true },
  });
  if (products.length === 0) return;

  const productIds = products.map((p) => p.id);
  await tx.productExtraCharge.deleteMany({
    where: { productId: { in: productIds } },
  });

  if (charges.length === 0) return;

  await tx.productExtraCharge.createMany({
    data: products.flatMap((product) =>
      charges.map((charge) => ({
        productId: product.id,
        name: charge.name,
        amount: charge.amount ?? null,
        percent: charge.percent ?? null,
        sourceCatalogImportId: catalogImportId,
      })),
    ),
  });
}

export async function copyProductExtraChargesFromManufacturer(
  tx: Tx,
  manufacturerId: string,
  productId: string,
) {
  const donor = await tx.product.findFirst({
    where: {
      manufacturerId,
      id: { not: productId },
      extraCharges: { some: {} },
    },
    select: {
      extraCharges: {
        select: {
          name: true,
          amount: true,
          percent: true,
          sourceCatalogImportId: true,
        },
      },
    },
  });
  if (!donor || donor.extraCharges.length === 0) return;

  await tx.productExtraCharge.createMany({
    data: donor.extraCharges.map((charge) => ({
      productId,
      name: charge.name,
      amount: charge.amount,
      percent: charge.percent,
      sourceCatalogImportId: charge.sourceCatalogImportId,
    })),
  });
}
