-- CreateManufacturer
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- Backfill manufacturer for existing data
INSERT INTO "Manufacturer" ("id", "name", "createdAt", "updatedAt")
VALUES ('legacy-imported-catalog', 'Imported catalog', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Product" ADD COLUMN "manufacturerId" TEXT;

UPDATE "Product" SET "manufacturerId" = 'legacy-imported-catalog' WHERE "manufacturerId" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "manufacturerId" SET NOT NULL;

ALTER TABLE "CatalogImport" ADD COLUMN "manufacturerId" TEXT;

UPDATE "CatalogImport" SET "manufacturerId" = 'legacy-imported-catalog' WHERE "manufacturerId" IS NULL;

ALTER TABLE "CatalogImport" ALTER COLUMN "manufacturerId" SET NOT NULL;

CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");
CREATE INDEX "CatalogImport_manufacturerId_idx" ON "CatalogImport"("manufacturerId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogImport" ADD CONSTRAINT "CatalogImport_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
