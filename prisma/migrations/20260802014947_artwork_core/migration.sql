-- CreateEnum
CREATE TYPE "DataOrigin" AS ENUM ('SEED', 'USER');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "childName" TEXT NOT NULL,
    "origin" "DataOrigin" NOT NULL DEFAULT 'SEED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "childQuote" TEXT,
    "madeOn" DATE NOT NULL,
    "origin" "DataOrigin" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Artwork_profileId_madeOn_idx" ON "Artwork"("profileId", "madeOn");

-- CreateIndex
CREATE INDEX "Artwork_origin_idx" ON "Artwork"("origin");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_artworkId_key" ON "Photo"("artworkId");

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
