/**
 * 시드 데이터와 적용 함수.
 *
 * 🔑 왜 prisma/seed.ts에서 이걸 떼어냈나
 *   [데모 초기화]가 이 함수를 다시 부른다. 그런데 prisma/seed.ts는 불러오는 순간
 *   main()이 스스로 돌고 process.exit()까지 부른다 — 라우트 핸들러에서 import하면 앱이 죽는다.
 *   그래서 **부수효과 없는 부분만** 여기로 옮겼다. 이 파일은 불러도 아무 일도 일어나지 않는다.
 *
 * 🔑 왜 초기화가 "USER 삭제" 하나로 부족한가
 *   심사자가 시드 작품의 설명을 고치면 그 행의 origin은 SEED 그대로다. 삭제 대상이 아니다.
 *   그러면 고쳐진 문장이 영구히 남는다. 초기화는 **USER 삭제 + 시드 재적용** 둘 다여야 하고,
 *   재적용이 곧 아래 applySeed다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "../generated/prisma/client";

/**
 * 이 함수가 쓰는 것만 요구한다.
 *
 * 🔑 왜 PrismaClient를 그대로 받지 않나
 *   [데모 초기화]가 이 함수를 **트랜잭션 안에서** 부른다. 트랜잭션 콜백이 주는 클라이언트는
 *   $transaction·$connect 같은 것이 빠져 있어서 PrismaClient와 타입이 다르다.
 *   여기서 필요한 건 profile·artwork 두 개뿐이라 그것만 요구하면 둘 다 들어온다.
 */
export type SeedClient = Pick<PrismaClient, "profile" | "artwork">;

/** 시드가 만든 아이는 언제나 한 명이다. id를 고정해 upsert 한 번으로 멱등해진다. */
export const SEED_PROFILE_ID = "seed-profile";

/** 가상의 아이. 실존 인물이 아니다. */
export const CHILD_NAME = "하늘";

export type SeedArtwork = {
  file: string;
  madeOn: string;
  /**
   * 아이가 한 말. **null일 수 있다.**
   *
   * 🔑 스키마와 문서가 "말 없는 사진은 나중에 채울 수 있다"고 세 곳에 적어놨는데,
   *   시드 10점이 전부 말을 갖고 있어서 **그 판단이 화면에 한 번도 렌더된 적이 없었다.**
   *   설명만 있고 증거가 없으면, 읽는 사람은 그게 실제로 동작하는지 알 수 없다.
   *   그래서 두 점을 비워 그 상태를 시드에 넣는다 — 결손이 아니라 **상태**다.
   */
  quote: string | null;
  width: number;
  height: number;
};

/**
 * 그림을 먼저 보고 나서 쓴 말이다.
 *
 * 이 순서(만든 날 오름차순)에는 의도가 있다.
 * 1월 그림에는 몸통이 없고 3월 그림에는 몸이 생긴다. 그리고 3월의 말이
 * "이번엔 몸도 그렸어"다. 두 장이 나란히 놓이면 왜 한 권으로 묶어야 하는지가
 * 저절로 설명된다.
 */
export const ARTWORKS: SeedArtwork[] = [
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
    /**
     * 두 번째로 비운 것. 한 점만 비우면 사고처럼 보이고, 둘이면 패턴이 보인다 —
     * "가끔 못 물어보는 날이 있다"가 이 서비스의 전제이기 때문이다.
     */
    quote: null,
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
    /**
     * 🔑 일부러 비웠다. 목록 최신 두 번째라 **격자 첫 줄에 빈 말이 뜬다.**
     *   눈에 안 띄는 자리에 두면 "우연히 하나 빠진 것"으로 읽힌다.
     *   비어 있다는 사실을 숨기지 않는 것이 이 서비스의 원칙이고(04-content §2-1),
     *   숨기지 않으려면 **잘 보이는 자리**에 있어야 한다.
     */
    quote: null,
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

/** 시드 작품의 id를 파일명에서 고정한다. cuid로 매번 뽑으면 재실행마다 같은 그림이 다른 작품이 된다. */
export function seedArtworkId(file: string): string {
  return `seed-${file.replace(/\.jpg$/, "")}`;
}

/**
 * 시드를 적용한다. 몇 번을 돌려도 같은 상태가 된다.
 *
 * 부르는 곳이 둘이다.
 *   ① prisma/seed.ts — 컨테이너가 뜰 때마다
 *   ② [데모 초기화] 라우트 — 심사자가 원상복구를 누를 때
 * 그래서 이 함수는 연결을 만들지도, 끊지도, 프로세스를 끝내지도 않는다.
 * 그건 부르는 쪽의 사정이다.
 */
export async function applySeed(prisma: SeedClient): Promise<number> {
  const seedDir = join(process.cwd(), "public", "seed");

  const profile = await prisma.profile.upsert({
    where: { id: SEED_PROFILE_ID },
    create: { id: SEED_PROFILE_ID, childName: CHILD_NAME, origin: "SEED" },
    update: { childName: CHILD_NAME },
  });

  for (const item of ARTWORKS) {
    const id = seedArtworkId(item.file);
    const bytes = readFileSync(join(seedDir, item.file));
    const photoData = {
      bytes,
      mimeType: "image/jpeg",
      width: item.width,
      height: item.height,
    };

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
        photo: { create: photoData },
      },
      // 🔑 update가 비어 있지 않은 이유가 [데모 초기화]다.
      //   심사자가 고친 설명·날짜를 여기서 원래 값으로 되돌린다.
      update: {
        childQuote: item.quote,
        madeOn: new Date(item.madeOn),
        // 바이트는 다시 쓰지 않는다 — 같은 파일이라 쓸 이유가 없다.
        // 그래도 upsert인 이유: 사진만 없는 작품이 남았을 때 스스로 복구한다.
        photo: {
          upsert: {
            create: photoData,
            update: { mimeType: "image/jpeg", width: item.width, height: item.height },
          },
        },
      },
    });
  }

  return prisma.artwork.count({ where: { origin: "SEED" } });
}
