/*
  Warnings:

  - You are about to drop the `_PropertyAmenities` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `propertyId` to the `Amenity` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."_PropertyAmenities" DROP CONSTRAINT "_PropertyAmenities_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_PropertyAmenities" DROP CONSTRAINT "_PropertyAmenities_B_fkey";

-- AlterTable
ALTER TABLE "public"."Amenity" ADD COLUMN     "propertyId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."_PropertyAmenities";

-- AddForeignKey
ALTER TABLE "public"."Amenity" ADD CONSTRAINT "Amenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
