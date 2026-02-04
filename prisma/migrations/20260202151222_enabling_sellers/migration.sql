-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "public"."PhoneNumberVerification" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneNumberVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneNumberVerification_phoneNumber_idx" ON "public"."PhoneNumberVerification"("phoneNumber");

-- AddForeignKey
ALTER TABLE "public"."PhoneNumberVerification" ADD CONSTRAINT "PhoneNumberVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
