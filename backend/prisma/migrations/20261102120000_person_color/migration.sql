-- CreateEnum
CREATE TYPE "PersonColor" AS ENUM ('BLUE', 'ORANGE', 'GREEN', 'PURPLE', 'PINK', 'TEAL', 'GOLD', 'BROWN', 'SLATE');

-- AlterTable
ALTER TABLE "person" ADD COLUMN     "color" "PersonColor";

-- Fill in existing people: the owner is Teal, everyone else takes the other eight in the order they were added.
UPDATE "person" SET "color" = 'TEAL' WHERE "isOwner";

WITH ranked AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS n
  FROM "person"
  WHERE NOT "isOwner"
)
UPDATE "person"
SET "color" = (ARRAY['BLUE', 'ORANGE', 'GREEN', 'PURPLE', 'PINK', 'GOLD', 'BROWN', 'SLATE']::"PersonColor"[])[((ranked.n - 1) % 8) + 1]
FROM ranked
WHERE "person"."id" = ranked."id";

ALTER TABLE "person" ALTER COLUMN "color" SET NOT NULL;
