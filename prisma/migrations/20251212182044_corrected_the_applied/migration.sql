/*
  Warnings:

  - A unique constraint covering the columns `[userId,propertyId]` on the table `appliesRequested` will be added. If there are existing duplicate values, this will fail.
  - Made the column `propertyId` on table `appliesRequested` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."appliesRequested_userId_key";

-- AlterTable
ALTER TABLE "public"."appliesRequested" ALTER COLUMN "propertyId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "appliesRequested_userId_propertyId_key" ON "public"."appliesRequested"("userId", "propertyId");
