-- AlterTable
ALTER TABLE "charge" ADD COLUMN     "correctsChargeId" TEXT;

-- CreateIndex
CREATE INDEX "charge_correctsChargeId_idx" ON "charge"("correctsChargeId");

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_correctsChargeId_fkey" FOREIGN KEY ("correctsChargeId") REFERENCES "charge"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Dev data only (v1 is not live): link each existing correction to the person's charge it fixes, the one in
-- its correctsMonth with its correctsCategory. A correction with no such charge is left unlinked and the CHECK
-- below then refuses the migration, rather than guessing.
UPDATE "charge" AS c
SET "correctsChargeId" = o."id"
FROM "charge" AS o
WHERE c."category" = 'CORRECTION'
  AND o."category" <> 'CORRECTION'
  AND o."personId" = c."personId"
  AND o."month" = c."correctsMonth"
  AND o."category" = c."correctsCategory";

-- A correction names the charge it fixes, and that charge's month and category; no other charge has any of
-- the three. Not representable in schema.prisma, so it lives here. Application code validates first
-- (src/lib/corrections/correction-fields.ts).
ALTER TABLE "charge" DROP CONSTRAINT "charge_correction_fields";
ALTER TABLE "charge" ADD CONSTRAINT "charge_correction_fields" CHECK (
  ("category" = 'CORRECTION'
     AND "correctsChargeId" IS NOT NULL
     AND "correctsMonth" IS NOT NULL
     AND "correctsCategory" IS NOT NULL
     AND "correctsCategory" <> 'CORRECTION')
  OR ("category" <> 'CORRECTION'
     AND "correctsChargeId" IS NULL
     AND "correctsMonth" IS NULL
     AND "correctsCategory" IS NULL)
);
