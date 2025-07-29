-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "description" TEXT,
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "licensePackId" TEXT,
ADD COLUMN     "licensePackPrice" DOUBLE PRECISION;
