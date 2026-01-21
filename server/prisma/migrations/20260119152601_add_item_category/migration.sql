-- CreateEnum
CREATE TYPE "public"."ItemCategory" AS ENUM ('ACCOUNTS', 'KEYS', 'SUBSCRIPTIONS', 'SERVICES', 'GAME_CURRENCIES', 'NFT_TOKENS', 'OTHER');

-- AlterTable
ALTER TABLE "public"."Item" ADD COLUMN     "category" "public"."ItemCategory" NOT NULL DEFAULT 'OTHER';
