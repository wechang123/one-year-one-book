-- 작품 1 : N 편지.
--
-- 🔴 이 마이그레이션은 스키마만 바꾸지 않는다. **데이터를 이사시킨다.**
--   시드 12점 중 10점에 말이 있고, 심사자가 만든 작품에도 말이 있을 수 있다.
--   빈 Letter 테이블로 시작하면 그 말들이 전부 사라진 채 화면이 뜬다.
--
-- 🔑 writtenOn을 madeOn으로 채운다 — 지금까지의 말은 전부
--   "그것을 내밀던 순간에 오간 말"로 받은 것이라(스키마 주석이 그렇게 정의했다),
--   만든 날이 곧 말한 날이다. 앞으로 오는 편지만 두 날짜가 갈라진다.
--
-- 🔑 id를 'l-' || 작품id 로 고정한다. 시드 재적용(lib/seed-data.ts)이 같은 규칙으로
--   upsert하므로, 여기서 옮긴 시드 편지와 시드가 만드는 편지가 같은 행이 된다.
--   무작위 id로 옮기면 첫 초기화 때 시드 편지가 두 통으로 불어난다.
--
-- 🔑 origin을 작품에서 그대로 물려받는다. 시드 작품의 말은 SEED 편지가 되어야
--   [데모 초기화]의 "USER 삭제"에 지워지지 않는다.

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "writtenBy" "Speaker" NOT NULL,
    "writtenOn" DATE NOT NULL,
    "origin" "DataOrigin" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Letter_artworkId_writtenOn_idx" ON "Letter"("artworkId", "writtenOn");

-- CreateIndex
CREATE INDEX "Letter_origin_idx" ON "Letter"("origin");

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 데이터 이사: 말이 있는 작품마다 편지 한 통.
INSERT INTO "Letter" ("id", "artworkId", "body", "writtenBy", "writtenOn", "origin", "createdAt", "updatedAt")
SELECT 'l-' || "id", "id", "childQuote", "quoteBy", "madeOn", "origin", "createdAt", "updatedAt"
FROM "Artwork"
WHERE "childQuote" IS NOT NULL;

-- 옛 컬럼은 지운다. 남기면 진실이 둘이 된다 —
-- 검색은 어느 쪽을 보나, 편집은 어느 쪽을 고치나. 위에서 옮겼으므로 잃는 것은 없다.
ALTER TABLE "Artwork" DROP COLUMN "childQuote",
DROP COLUMN "quoteBy";
