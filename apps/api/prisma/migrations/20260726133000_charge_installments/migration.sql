-- Taxas e material podem ser parcelados em até três vencimentos mensais.
ALTER TYPE "InvoiceType" ADD VALUE IF NOT EXISTS 'ENROLLMENT_FEE';

ALTER TABLE "enrollments"
  ADD COLUMN "enrollmentFeeInstallments" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "materialFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "materialInstallments" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "tuition_invoices"
  ADD COLUMN "installmentNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "installmentCount" INTEGER NOT NULL DEFAULT 1;
