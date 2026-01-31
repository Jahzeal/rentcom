/*
  Warnings:

  - Added the required column `decription` to the `enscroll` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."enscroll" ADD COLUMN     "decription" TEXT NOT NULL,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;
