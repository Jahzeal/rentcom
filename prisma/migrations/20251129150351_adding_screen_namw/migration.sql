/*
  Warnings:

  - A unique constraint covering the columns `[Screenname]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "Screenname" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_Screenname_key" ON "User"("Screenname");
