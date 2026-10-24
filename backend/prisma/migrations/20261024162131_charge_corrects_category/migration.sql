-- AlterTable
ALTER TABLE "charge" ADD COLUMN     "correctsCategory" "ChargeCategory";

-- Dev data only (v1 is not live): the seeded corrections all fix utilities.
UPDATE "charge" SET "correctsCategory" = 'UTILITIES' WHERE "category" = 'CORRECTION';

-- A correction says which month and which category it fixes; no other charge has a correctsCategory.
-- Not representable in schema.prisma, so it lives here. Application code validates first.
ALTER TABLE "charge" ADD CONSTRAINT "charge_correction_fields" CHECK (
  ("category" = 'CORRECTION'
     AND "correctsMonth" IS NOT NULL
     AND "correctsCategory" IS NOT NULL
     AND "correctsCategory" <> 'CORRECTION')
  OR ("category" <> 'CORRECTION' AND "correctsCategory" IS NULL)
);
