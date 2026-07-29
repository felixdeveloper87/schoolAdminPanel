-- Additive change: existing enrollment records keep their current values.
ALTER TABLE "enrollments"
  ADD COLUMN "enrollmentFeeEntryCents" INTEGER NOT NULL DEFAULT 0;
