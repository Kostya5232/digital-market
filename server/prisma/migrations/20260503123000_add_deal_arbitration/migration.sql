CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'COMPLETED', 'DISPUTED');

CREATE TYPE "OrderMessageType" AS ENUM ('TEXT', 'SYSTEM', 'DELIVERY');

ALTER TABLE "Order"
ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN "deliveryData" TEXT,
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "disputedAt" TIMESTAMP(3);

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PAID';

CREATE TABLE "OrderMessage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "OrderMessageType" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderMessage_orderId_createdAt_idx" ON "OrderMessage"("orderId", "createdAt");

ALTER TABLE "OrderMessage"
ADD CONSTRAINT "OrderMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderMessage"
ADD CONSTRAINT "OrderMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
