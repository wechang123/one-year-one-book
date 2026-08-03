/**
 * 시드 실행기 — docker compose가 컨테이너를 띄울 때마다 부른다.
 *
 * 실제 데이터와 적용 로직은 lib/seed-data.ts에 있다.
 * 이 파일에는 **부수효과만** 남긴다 — .env 읽기, 연결 끊기, 종료 코드.
 * [데모 초기화] 라우트는 저쪽(applySeed)만 부르고 이 파일은 건드리지 않는다.
 *
 * 🔴 책과 주문은 일부러 비워둔다.
 *   이전 프로젝트에서 시드가 12칸 중 11칸을 채웠고, 심사자는 눌러볼 게 없었다.
 *   여기서는 "책 만들기"와 "주문하기"를 심사자 몫으로 남긴다.
 */
import { getPrisma } from "../lib/prisma";
import { applySeed, CHILD_NAME } from "../lib/seed-data";

/**
 * .env를 읽어들인다.
 *
 * 컨테이너에서는 docker compose가 DATABASE_URL을 직접 넣어준다(.env는 이미지에 없다).
 * 로컬에서 `npm run seed`를 칠 때만 이 줄이 필요하다.
 *
 * ① dotenv를 안 쓰는 이유 — 이 파일은 프로덕션 컨테이너에서도 실행된다.
 *   거기서 개발 의존성에 기대고 싶지 않다. Node가 이미 같은 일을 한다.
 * ② import보다 아래에 있어도 되는 이유 — lib/prisma는 불러오는 시점이 아니라
 *   getPrisma()를 부르는 시점에 DATABASE_URL을 읽는다. 그때는 이미 채워져 있다.
 */
try {
  process.loadEnvFile();
} catch {
  // .env가 없는 건 정상이다(컨테이너). 이미 들어온 환경변수를 그대로 쓴다.
}

async function main() {
  const prisma = getPrisma();
  const count = await applySeed(prisma);

  console.log(`[seed] 아이 "${CHILD_NAME}" · 작품 ${count}점`);
  console.log("[seed] 책·주문은 넣지 않는다 — 심사자가 직접 만들어볼 몫이다");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[seed] 실패:", e);
  process.exit(1);
});
