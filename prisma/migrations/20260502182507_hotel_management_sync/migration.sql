-- CreateEnum
CREATE TYPE "public"."StaffRole" AS ENUM ('MANAGER', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "public"."RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- AlterEnum
ALTER TYPE "public"."PropertyType" ADD VALUE 'HOTEL_ROOM';

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "hotelRoomId" TEXT,
ADD COLUMN     "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processedByStaffId" TEXT;

-- CreateTable
CREATE TABLE "public"."ManagementStaff" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."StaffRole" NOT NULL DEFAULT 'RECEPTIONIST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HotelRoom" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomName" TEXT,
    "category" TEXT NOT NULL,
    "floor" TEXT,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "amenities" TEXT,
    "status" "public"."RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagementStaff_username_key" ON "public"."ManagementStaff"("username");

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_processedByStaffId_fkey" FOREIGN KEY ("processedByStaffId") REFERENCES "public"."ManagementStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_hotelRoomId_fkey" FOREIGN KEY ("hotelRoomId") REFERENCES "public"."HotelRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ManagementStaff" ADD CONSTRAINT "ManagementStaff_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HotelRoom" ADD CONSTRAINT "HotelRoom_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
