-- 주문 중복 제출을 DB가 막는다.
--
-- 조회해서 "없으면 만든다"는 조회와 생성 사이가 비어 있어, 두 요청이 동시에 들어오면
-- 둘 다 "없다"를 보고 둘 다 만든다. 실제로 그렇게 두 건이 생겼다.
-- 책이 @@unique([profileId, year])로 같은 문제를 막는 것과 같은 자리다.
--
-- nullable인 이유: Postgres는 NULL을 서로 다른 값으로 보므로, 이 열이 생기기 전에
-- 만들어진 주문은 제약을 타지 않는다. 그것들을 지어낸 값으로 채우지 않는다.
ALTER TABLE "Order" ADD COLUMN "dedupKey" TEXT;

CREATE UNIQUE INDEX "Order_dedupKey_key" ON "Order"("dedupKey");
