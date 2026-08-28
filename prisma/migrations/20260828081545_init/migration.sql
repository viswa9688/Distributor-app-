-- CreateEnum
CREATE TYPE "PriceKind" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "PriceSourceType" AS ENUM ('CATALOG', 'INVOICE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('REVIEW', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "MatchConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NONE');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('PROCESSING', 'REVIEW', 'APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "CatalogLineAction" AS ENUM ('CREATE', 'UPDATE', 'SKIP', 'UNCERTAIN');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT,
    "currentBuyPrice" DECIMAL(12,2) NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "sizeValue" DECIMAL(12,4),
    "sizeUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "PriceKind" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" "PriceSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "retailerName" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "imagePath" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'REVIEW',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "rawDescription" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "matchConfidence" "MatchConfidence" NOT NULL DEFAULT 'NONE',
    "matchCandidates" JSONB,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogImport" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogLine" (
    "id" TEXT NOT NULL,
    "catalogImportId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "matchedProductId" TEXT,
    "action" "CatalogLineAction" NOT NULL DEFAULT 'CREATE',
    "matchConfidence" "MatchConfidence" NOT NULL DEFAULT 'NONE',
    "matchCandidates" JSONB,

    CONSTRAINT "CatalogLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraCharge" (
    "id" TEXT NOT NULL,
    "catalogImportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "percent" DECIMAL(8,4),

    CONSTRAINT "ExtraCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_normalizedName_idx" ON "Product"("normalizedName");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_kind_recordedAt_idx" ON "PriceHistory"("productId", "kind", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_productId_idx" ON "InvoiceLine"("productId");

-- CreateIndex
CREATE INDEX "CatalogLine_catalogImportId_idx" ON "CatalogLine"("catalogImportId");

-- CreateIndex
CREATE INDEX "CatalogLine_matchedProductId_idx" ON "CatalogLine"("matchedProductId");

-- CreateIndex
CREATE INDEX "ExtraCharge_catalogImportId_idx" ON "ExtraCharge"("catalogImportId");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogLine" ADD CONSTRAINT "CatalogLine_catalogImportId_fkey" FOREIGN KEY ("catalogImportId") REFERENCES "CatalogImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogLine" ADD CONSTRAINT "CatalogLine_matchedProductId_fkey" FOREIGN KEY ("matchedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraCharge" ADD CONSTRAINT "ExtraCharge_catalogImportId_fkey" FOREIGN KEY ("catalogImportId") REFERENCES "CatalogImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
