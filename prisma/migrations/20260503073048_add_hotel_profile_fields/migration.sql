-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "hotelAddress" TEXT,
ADD COLUMN     "hotelCoords" JSONB,
ADD COLUMN     "hotelLocation" TEXT,
ADD COLUMN     "hotelName" TEXT;
