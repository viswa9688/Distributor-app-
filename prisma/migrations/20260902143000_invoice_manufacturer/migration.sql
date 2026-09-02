-- Invoice belongs to a manufacturer (sales match that supplier's products only).
ALTER TABLE "Invoice" ADD COLUMN "manufacturerId" TEXT;

-- No rows expected after business-data wipe; NOT NULL is safe.
ALTER TABLE "Invoice" ALTER COLUMN "manufacturerId" SET NOT NULL;

CREATE INDEX "Invoice_manufacturerId_idx" ON "Invoice"("manufacturerId");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
