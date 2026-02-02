/*
  Warnings:

  - You are about to drop the column `verified` on the `enscroll` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."enscroll" DROP COLUMN "verified";
