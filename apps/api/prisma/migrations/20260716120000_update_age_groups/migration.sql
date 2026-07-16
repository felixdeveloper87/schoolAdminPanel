-- Replace the age-group enum while retaining existing classroom and waitlist data.
CREATE TYPE "AgeGroup_new" AS ENUM (
  'INTEGRAL_1',
  'INTEGRAL_2',
  'INTEGRAL_3',
  'MATERNAL_1',
  'MATERNAL_2',
  'PRE_1',
  'PRE_2',
  'ANO_1',
  'ANO_2',
  'ANO_3',
  'ANO_4',
  'ANO_5'
);

ALTER TABLE "classrooms"
  ALTER COLUMN "ageGroup" TYPE "AgeGroup_new"
  USING (
    CASE "ageGroup"::text
      WHEN 'BERCARIO_1' THEN 'INTEGRAL_1'
      WHEN 'BERCARIO_2' THEN 'INTEGRAL_2'
      ELSE "ageGroup"::text
    END
  )::"AgeGroup_new";

ALTER TABLE "waitlist_entries"
  ALTER COLUMN "desiredAgeGroup" TYPE "AgeGroup_new"
  USING (
    CASE "desiredAgeGroup"::text
      WHEN 'BERCARIO_1' THEN 'INTEGRAL_1'
      WHEN 'BERCARIO_2' THEN 'INTEGRAL_2'
      ELSE "desiredAgeGroup"::text
    END
  )::"AgeGroup_new";

DROP TYPE "AgeGroup";
ALTER TYPE "AgeGroup_new" RENAME TO "AgeGroup";
