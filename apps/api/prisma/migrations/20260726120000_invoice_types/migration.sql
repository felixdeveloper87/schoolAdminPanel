-- Separa mensalidades de cobranças anuais/avulsas para que cada uma tenha
-- vencimento, baixa e recibo próprios.
CREATE TYPE "InvoiceType" AS ENUM ('MONTHLY_TUITION', 'RENEWAL_FEE', 'SCHOOL_MATERIAL');

ALTER TABLE "tuition_invoices"
  ADD COLUMN "type" "InvoiceType" NOT NULL DEFAULT 'MONTHLY_TUITION';

DROP INDEX "tuition_invoices_schoolId_enrollmentId_competence_key";

CREATE UNIQUE INDEX "tuition_invoices_schoolId_enrollmentId_competence_type_key"
  ON "tuition_invoices"("schoolId", "enrollmentId", "competence", "type");
