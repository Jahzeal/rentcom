-- CreateTable
CREATE TABLE "public"."enscroll" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "HostelName" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "enscroll_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."enscroll" ADD CONSTRAINT "enscroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
