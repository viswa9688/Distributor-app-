-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuoteLine" (
    "id" TEXT NOT NULL,
    "salesQuoteId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "manufacturerName" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "buyPrice" DECIMAL(12,2) NOT NULL,
    "extraChargesTotal" DECIMAL(12,2) NOT NULL,
    "baseCost" DECIMAL(12,2) NOT NULL,
    "marginPercent" DECIMAL(8,4) NOT NULL,
    "unitQuotePrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SalesQuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesQuote_clientId_createdAt_idx" ON "SalesQuote"("clientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SalesQuoteLine_salesQuoteId_idx" ON "SalesQuoteLine"("salesQuoteId");

-- CreateIndex
CREATE INDEX "SalesQuoteLine_productId_idx" ON "SalesQuoteLine"("productId");

-- AddForeignKey
ALTER TABLE "SalesQuote" ADD CONSTRAINT "SalesQuote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuoteLine" ADD CONSTRAINT "SalesQuoteLine_salesQuoteId_fkey" FOREIGN KEY ("salesQuoteId") REFERENCES "SalesQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuoteLine" ADD CONSTRAINT "SalesQuoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
