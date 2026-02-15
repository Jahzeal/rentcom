/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `PhoneNumberVerification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."PhoneNumberVerification" DROP COLUMN "passwordHash";

-- CreateTable
CREATE TABLE "public"."Shortlet" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shortlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomOption" (
    "id" TEXT NOT NULL,
    "shortletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beds" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amenities" TEXT[],
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shortlet_propertyId_key" ON "public"."Shortlet"("propertyId");

-- CreateIndex
CREATE INDEX "RoomOption_shortletId_idx" ON "public"."RoomOption"("shortletId");

-- AddForeignKey
ALTER TABLE "public"."Shortlet" ADD CONSTRAINT "Shortlet_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomOption" ADD CONSTRAINT "RoomOption_shortletId_fkey" FOREIGN KEY ("shortletId") REFERENCES "public"."Shortlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
