-- Mantém separado o valor de material dentro de cada parcela da rematrícula.
ALTER TABLE "tuition_invoices"
  ADD COLUMN "materialCents" INTEGER NOT NULL DEFAULT 0;
