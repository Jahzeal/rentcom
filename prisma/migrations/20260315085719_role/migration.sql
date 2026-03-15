-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'AGENT';

-- AlterTable
ALTER TABLE "public"."EmailVerification" ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'USER';
