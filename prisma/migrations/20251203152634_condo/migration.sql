/*
  Warnings:

  - The values [HOUSE,CONDO,TOWNHOUSE] on the enum `PropertyType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PropertyType_new" AS ENUM ('APARTMENT', 'ShortLET', 'Hostels');
ALTER TABLE "public"."Property" ALTER COLUMN "type" TYPE "public"."PropertyType_new" USING ("type"::text::"public"."PropertyType_new");
ALTER TYPE "public"."PropertyType" RENAME TO "PropertyType_old";
ALTER TYPE "public"."PropertyType_new" RENAME TO "PropertyType";
DROP TYPE "public"."PropertyType_old";
COMMIT;
