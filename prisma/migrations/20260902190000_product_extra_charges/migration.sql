-- CreateTable
CREATE TABLE "ProductExtraCharge" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "percent" DECIMAL(8,4),
    "sourceCatalogImportId" TEXT,

    CONSTRAINT "ProductExtraCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductExtraCharge_productId_idx" ON "ProductExtraCharge"("productId");

-- CreateIndex
CREATE INDEX "ProductExtraCharge_sourceCatalogImportId_idx" ON "ProductExtraCharge"("sourceCatalogImportId");

-- AddForeignKey
ALTER TABLE "ProductExtraCharge" ADD CONSTRAINT "ProductExtraCharge_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExtraCharge" ADD CONSTRAINT "ProductExtraCharge_sourceCatalogImportId_fkey" FOREIGN KEY ("sourceCatalogImportId") REFERENCES "CatalogImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from latest applied catalog per manufacturer
INSERT INTO "ProductExtraCharge" ("id", "productId", "name", "amount", "percent", "sourceCatalogImportId")
SELECT
    'pec' || substr(md5(p."id" || ec."id"), 1, 22),
    p."id",
    ec."name",
    ec."amount",
    ec."percent",
    lc.catalog_id
FROM "Product" p
INNER JOIN (
    SELECT DISTINCT ON (ci."manufacturerId")
        ci."id" AS catalog_id,
        ci."manufacturerId"
    FROM "CatalogImport" ci
    WHERE ci."status" = 'APPLIED'
    ORDER BY ci."manufacturerId", ci."createdAt" DESC
) lc ON lc."manufacturerId" = p."manufacturerId"
INNER JOIN "ExtraCharge" ec ON ec."catalogImportId" = lc.catalog_id;
