/**
 * 시드 — 작품 10점만 넣는다.
 *
 * 🔴 책과 주문은 일부러 비워둔다.
 *   이전 프로젝트에서 시드가 12칸 중 11칸을 채워버렸고, 심사자는 눌러볼 게 없었다.
 *   여기서는 "책 만들기"와 "주문하기"를 심사자 몫으로 남긴다.
 *
 * 멱등해야 한다 — 몇 번을 돌려도 같은 상태여야 한다.
 * docker compose는 컨테이너가 뜰 때마다 이 파일을 실행한다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPrisma } from "../lib/prisma";

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

const SEED_DIR = join(process.cwd(), "public", "seed");

/** 가상의 아이. 실존 인물이 아니다. */
const CHILD_NAME = "하늘";

/**
 * 그림을 먼저 보고 나서 쓴 말이다.
 *
 * 이 순서(만든 날 오름차순)에는 의도가 있다.
 * 1월 그림에는 몸통이 없고 3월 그림에는 몸이 생긴다. 그리고 3월의 말이
 * "이번엔 몸도 그렸어"다. 두 장이 나란히 놓이면 왜 한 권으로 묶어야 하는지가
 * 저절로 설명된다.
 */
const ARTWORKS: {
  file: string;
  madeOn: string;
  quote: string;
  width: number;
  height: number;
}[] = [
  {
    file: "09-tadpole.jpg",
    madeOn: "2026-01-08",
    quote: "몸통은 안 그렸어. 옷 입고 있으니까 안 보이잖아.",
    width: 359,
    height: 606,
  },
  {
    file: "04-mom-and-me.jpg",
    madeOn: "2026-01-23",
    quote: "엄마랑 나야. 얼굴에 있는 이 줄은 이불이야. 같이 누워 있는 거야.",
    width: 1157,
    height: 1294,
  },
  {
    file: "02-family.jpg",
    madeOn: "2026-02-09",
    quote: "이빨 무서운 거 아니야. 다 웃는 거야.",
    width: 1280,
    height: 964,
  },
  {
    file: "10-self-portrait.jpg",
    madeOn: "2026-03-03",
    quote: "이건 나. 이번엔 몸도 그렸어.",
    width: 618,
    height: 863,
  },
  {
    file: "06-house.jpg",
    madeOn: "2026-03-30",
    quote: "창문 앞에 있는 거 커튼 아니야. 다 나야. 내가 네 명이면 좋겠어서.",
    width: 1280,
    height: 881,
  },
  {
    file: "07-people.jpg",
    madeOn: "2026-04-11",
    quote: "아추! 하는 거야. 꽃 냄새 맡다가 재채기했어.",
    width: 830,
    height: 1161,
  },
  {
    file: "01-girl.jpg",
    madeOn: "2026-05-14",
    quote: "나 아니야. 선생님이야. 오늘 이 옷 입고 왔어.",
    width: 1194,
    height: 1843,
  },
  {
    file: "05-car.jpg",
    madeOn: "2026-06-02",
    quote: "아빠 차야. 근데 진짜는 이렇게 안 생겼어. 내가 더 좋게 고쳤어.",
    width: 1280,
    height: 741,
  },
  {
    file: "08-comic.jpg",
    madeOn: "2026-07-05",
    quote: "만화야. 이 사람 넘어졌는데 안 아파. 말랑말랑해서.",
    width: 830,
    height: 1166,
  },
  {
    file: "03-rooster.jpg",
    madeOn: "2026-07-19",
    quote: "닭이 나 쫓아왔어. 근데 안 울었어.",
    width: 1280,
    height: 905,
  },
];

/**
 * 시드 작품의 id를 파일명에서 고정한다.
 *
 * cuid로 매번 새로 뽑으면 재실행할 때마다 같은 그림이 다른 작품이 된다.
 * id가 고정이면 upsert 한 번으로 멱등해진다.
 */
function seedId(file: string): string {
  return `seed-${file.replace(/\.jpg$/, "")}`;
}

async function main() {
  const prisma = getPrisma();

  // 프로필도 id를 고정한다. 시드가 만든 아이는 언제나 한 명이다.
  const profile = await prisma.profile.upsert({
    where: { id: "seed-profile" },
    create: { id: "seed-profile", childName: CHILD_NAME, origin: "SEED" },
    update: { childName: CHILD_NAME },
  });

  for (const item of ARTWORKS) {
    const id = seedId(item.file);
    const bytes = readFileSync(join(SEED_DIR, item.file));

    await prisma.artwork.upsert({
      where: { id },
      create: {
        id,
        profileId: profile.id,
        childQuote: item.quote,
        // "2026-01-08"은 UTC 자정으로 해석된다. 컬럼이 date라 시각은 잘려나가고
        // 날짜만 남는다. 어느 시간대에서 읽어도 같은 날짜다.
        madeOn: new Date(item.madeOn),
        origin: "SEED",
        photo: {
          create: {
            bytes,
            mimeType: "image/jpeg",
            width: item.width,
            height: item.height,
          },
        },
      },
      update: {
        childQuote: item.quote,
        madeOn: new Date(item.madeOn),
        // 재실행 시 바이트는 다시 쓰지 않는다 — 같은 파일이라 쓸 이유가 없다.
        // 그래도 upsert인 이유: 사진만 없는 작품이 남았을 때 스스로 복구한다.
        photo: {
          upsert: {
            create: {
              bytes,
              mimeType: "image/jpeg",
              width: item.width,
              height: item.height,
            },
            update: { mimeType: "image/jpeg", width: item.width, height: item.height },
          },
        },
      },
    });
  }

  const count = await prisma.artwork.count({ where: { origin: "SEED" } });
  console.log(`[seed] 아이 "${CHILD_NAME}" · 작품 ${count}점`);
  console.log("[seed] 책·주문은 넣지 않는다 — 심사자가 직접 만들어볼 몫이다");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[seed] 실패:", e);
  process.exit(1);
});
