-- CreateEnum
CREATE TYPE "SongStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "songs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "musicTag" TEXT NOT NULL,
    "pricing" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "duration" TEXT NOT NULL,
    "bpm" INTEGER,
    "audioFile" TEXT,
    "audioFilename" TEXT,
    "coverImage" TEXT,
    "coverImageFilename" TEXT,
    "status" "SongStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
