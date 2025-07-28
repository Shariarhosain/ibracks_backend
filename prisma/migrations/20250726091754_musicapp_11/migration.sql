/*
  Warnings:

  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventBooking` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EventBooking" DROP CONSTRAINT "EventBooking_eventId_fkey";

-- DropForeignKey
ALTER TABLE "EventBooking" DROP CONSTRAINT "EventBooking_userId_fkey";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "EventBooking";
