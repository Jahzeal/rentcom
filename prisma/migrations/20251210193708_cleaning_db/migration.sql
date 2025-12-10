/*
  Warnings:

  - Added the required column `coords` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `offers` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `price` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "coords" JSONB NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "offers" TEXT NOT NULL,
DROP COLUMN "price",
ADD COLUMN     "price" JSONB NOT NULL;
