/*
  Warnings:

  - You are about to drop the column `description` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `licensePackId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `licensePackPrice` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "description",
DROP COLUMN "features",
DROP COLUMN "licensePackId",
DROP COLUMN "licensePackPrice";
