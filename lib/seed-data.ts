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
export type SeedClient = Pick<PrismaClient, "profile" | "artwork" | "letter">;

/** 시드가 만든 아이는 언제나 한 명이다. id를 고정해 upsert 한 번으로 멱등해진다. */
export const SEED_PROFILE_ID = "seed-profile";

/** 가상의 아이. 실존 인물이 아니다. */
export const CHILD_NAME = "하늘";

/**
 * 출산예정일과 태어난 날.
 *
 * 🔑 **일부러 다르게 뒀다.** 예정일보다 엿새 늦게 태어난 아이다.
 *   두 값을 따로 저장하는 이유가 이 엿새에 다 들어 있다 —
 *   태어난 날을 40주 0일로 놓고 거꾸로 세면 임신 구간의 주차가 통째로 밀린다.
 *   시드가 두 값을 같게 두면 그 차이가 화면에 한 번도 안 나타나고,
 *   **읽는 사람은 필드가 왜 둘인지 알 수 없다.**
 */
export const DUE_ON = "2019-03-08";
export const BORN_ON = "2019-03-14";

export type SeedArtwork = {
  file: string;
  madeOn: string;
  /**
   * 그때 받은 말. **null일 수 있다.**
   *
   * 🔑 스키마와 문서가 "말 없는 사진은 나중에 채울 수 있다"고 세 곳에 적어놨는데,
   *   시드 10점이 전부 말을 갖고 있어서 **그 판단이 화면에 한 번도 렌더된 적이 없었다.**
   *   설명만 있고 증거가 없으면, 읽는 사람은 그게 실제로 동작하는지 알 수 없다.
   *   그래서 두 점을 비워 그 상태를 시드에 넣는다 — 결손이 아니라 **상태**다.
   *
   * 🔑 Letter로 옮겨간 뒤에도 시드는 **작품당 한 통**이다.
   *   전부 "그것을 내밀던 순간에 오간 말"이라 writtenOn = madeOn이고,
   *   나중에 도착한 편지(둘째 통부터)는 심사자가 직접 만들어보는 몫으로 비워둔다 —
   *   책·주문을 비워둔 것과 같은 이유다. 남이 만든 것을 구경하는 것보다
   *   직접 만든 편지에 간격("N년 뒤에 쓴 편지")이 붙는 것을 보는 편이 강하다.
   */
  quote: string | null;
  /**
   * 말의 주인. 안 적으면 아이다.
   *
   * 🔴 **이 필드가 없어서 실제로 버그가 났다.** quoteBy를 스키마에 넣고 화면까지 다 연결한 뒤
   *   시드에는 안 넣었더니, 심사자가 값을 바꾼 시드 행이 [처음 상태로 되돌리기]에도
   *   **안 돌아왔다.** origin은 SEED라 삭제 대상이 아니고, 재적용 update가 이 열을 안 건드렸기 때문이다.
   *   초기화가 "USER 삭제 + 시드 재적용"인 이유가 바로 이건데, 재적용이 새 열을 빠뜨리면 그 설계가 샌다.
   *   **되돌릴 수 있는 열을 늘릴 때마다 이 파일도 같이 늘어나야 한다.**
   */
  by?: "CHILD" | "PARENT";
  width: number;
  height: number;
};

/**
 * 12점. 임신 14주부터 초등 저학년까지.
 *
 * 🔑 **말이 먼저가 아니라 그림이 먼저다.** 그림을 그려놓고 그 그림에 맞는 말을 썼다.
 *   반대로 하면 *"문장에 정확히 맞는 그림"*을 구해야 하는데, 실제 순서는 언제나
 *   물건이 먼저고 말이 나중이다.
 *
 * 🔑 열 개의 말이 전부 **사진만으로는 알 수 없는 것**을 담는다.
 *   아홉은 사진에 없는 사실이고(심장 소리·퇴원복·반 전체가 받은 상장),
 *   하나는 **앞 장과 나란히 놓여야 읽히는 것**이다 — `10-self-b`의 *"이번엔"*.
 *   이건 자연 표본이 아니라 **골라 쓴 것**이다. 이 서비스가 지키겠다는 것이
 *   *"안 물어보면 사라지는 말"*이라, 시드가 그걸 한 번도 안 보여주면 주장에 증거가 없다.
 *
 * 🔑 두 점은 비워뒀다(`06-scribble`·`11-paper-fold`).
 *   한 점만 비우면 사고로 보이고, 둘이면 *"가끔 못 물어보는 날이 있다"*는 상태로 읽힌다.
 *   `11-paper-fold`가 **최신 두 번째**라 격자 첫 줄에 빈 말이 뜬다 — 숨기지 않으려면 잘 보여야 한다.
 *
 * 🔑 `09-self-a`와 `10-self-b`는 **3주 차이로 붙여뒀다.**
 *   상세 화면의 병치가 앞뒤 한 점씩을 보여주므로 둘이 실제로 한 화면에서 만난다.
 *   *"머리만 그린 거 아니야. 그리다가 밥 먹으래서 못 그린 거야"* 다음에
 *   *"이번엔 몸도 그렸어"*가 온다. 앞의 말이 없으면 어른은 그 그림을
 *   **"아직 몸을 못 그리는 아이"로 읽는다.** 이 서비스가 막으려는 것이 정확히 그거다.
 */
export const ARTWORKS: SeedArtwork[] = [
  {
    file: "01-scan-14w.jpg",
    madeOn: "2018-09-12",
    quote: "오늘 처음 심장 소리 들었어. 생각보다 훨씬 빨라서 잘못 들은 줄 알았다.",
    by: "PARENT",
    width: 900,
    height: 1200,
  },
  {
    file: "02-scan-32w.jpg",
    madeOn: "2019-01-16",
    quote: "계속 손으로 얼굴을 가리고 있어서, 사진 한 장 찍는 데 삼십 분 걸렸다.",
    by: "PARENT",
    width: 900,
    height: 1200,
  },
  {
    file: "03-first-clothes.jpg",
    madeOn: "2019-04-22",
    quote: "퇴원할 때 입혔던 옷. 소매가 남아서 손이 아예 안 나왔다.",
    by: "PARENT",
    width: 1280,
    height: 960,
  },
  {
    file: "04-handprint.jpg",
    madeOn: "2019-09-14",
    quote: "손도장 찍는 데 세 번 실패했다. 주먹을 안 펴서.",
    by: "PARENT",
    width: 900,
    height: 1200,
  },
  {
    file: "05-tadpole.jpg",
    madeOn: "2022-06-11",
    quote: "몸통은 안 그렸어. 옷 입고 있으니까 안 보이잖아.",
    width: 900,
    height: 1240,
  },
  {
    file: "06-scribble.jpg",
    madeOn: "2022-10-05",
    // 비운 것 ①. 아이는 말할 수 있는 나이라 화면에 "아직 안 물어봤어요"가 뜬다.
    quote: null,
    width: 1280,
    height: 930,
  },
  {
    file: "07-family.jpg",
    madeOn: "2026-01-24",
    quote: "이빨 무서운 거 아니야. 다 웃는 거야.",
    width: 1280,
    height: 930,
  },
  {
    file: "08-award.jpg",
    madeOn: "2026-03-20",
    quote: "이거 나 혼자 받은 거 아니야. 우리 반 다 받았어.",
    width: 880,
    height: 1244,
  },
  {
    file: "09-self-a.jpg",
    madeOn: "2026-05-09",
    quote: "머리만 그린 거 아니야. 그리다가 밥 먹으래서 못 그린 거야.",
    width: 900,
    height: 1240,
  },
  {
    file: "10-self-b.jpg",
    madeOn: "2026-05-30",
    quote: "이건 나. 이번엔 몸도 그렸어.",
    width: 900,
    height: 1240,
  },
  {
    file: "11-paper-fold.jpg",
    madeOn: "2026-06-27",
    // 비운 것 ②. 최신 두 번째라 격자 첫 줄에 뜬다.
    quote: null,
    width: 1280,
    height: 960,
  },
  {
    file: "12-rooster.jpg",
    madeOn: "2026-07-19",
    quote: "닭이 나 쫓아왔어. 근데 안 울었어.",
    width: 1280,
    height: 930,
  },
];

/** 시드 작품의 id를 파일명에서 고정한다. cuid로 매번 뽑으면 재실행마다 같은 그림이 다른 작품이 된다. */
export function seedArtworkId(file: string): string {
  return `seed-${file.replace(/\.jpg$/, "")}`;
}

/**
 * 시드 편지의 id. **마이그레이션이 옮긴 행과 같은 규칙**('l-' || 작품id)이다.
 * 규칙이 다르면 첫 [데모 초기화] 때 같은 편지가 두 통으로 불어난다.
 */
export function seedLetterId(file: string): string {
  return `l-${seedArtworkId(file)}`;
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

  const birth = { dueOn: new Date(DUE_ON), bornOn: new Date(BORN_ON) };

  const profile = await prisma.profile.upsert({
    where: { id: SEED_PROFILE_ID },
    create: { id: SEED_PROFILE_ID, childName: CHILD_NAME, origin: "SEED", ...birth },
    update: { childName: CHILD_NAME, ...birth },
  });

  /**
   * 🔴 목록에서 빠진 시드 행을 지운다.
   *   시드를 12점으로 갈아엎으면서 **옛 10점의 id가 목록에서 사라졌다.**
   *   upsert만 돌리면 옛 행은 `origin = SEED`라 [처음 상태로 되돌리기]에도 안 지워지고,
   *   그대로 남아 **22점짜리 데모**가 된다. 실제로 밟기 전에 여기서 막는다.
   *   "시드를 적용한다"는 곧 **목록과 DB를 같게 만든다**는 뜻이어야 한다.
   */
  await prisma.artwork.deleteMany({
    where: { origin: "SEED", id: { notIn: ARTWORKS.map((a) => seedArtworkId(a.file)) } },
  });

  /**
   * 🔑 시드 목록에 없는 SEED 편지도 같이 지운다. 위의 작품 정리와 같은 이유다 —
   *   시드에서 말을 빼거나 바꾸면 옛 편지가 SEED로 남아 [처음 상태로 되돌리기]에도 안 사라진다.
   *   (USER 편지는 건드리지 않는다. 그건 [데모 초기화]의 일이다.)
   */
  await prisma.letter.deleteMany({
    where: {
      origin: "SEED",
      id: { notIn: ARTWORKS.filter((a) => a.quote !== null).map((a) => seedLetterId(a.file)) },
    },
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
        // "2026-01-08"은 UTC 자정으로 해석된다. 컬럼이 date라 시각은 잘려나가고
        // 날짜만 남는다. 어느 시간대에서 읽어도 같은 날짜다.
        madeOn: new Date(item.madeOn),
        origin: "SEED",
        photo: { create: photoData },
      },
      // 🔑 update가 비어 있지 않은 이유가 [데모 초기화]다.
      //   심사자가 고친 날짜를 여기서 원래 값으로 되돌린다.
      update: {
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

    /**
     * 🔑 그때의 말은 편지 한 통으로 들어간다. writtenOn = madeOn —
     *   시드의 말은 전부 "내밀던 순간에 오간 말"이라 만든 날이 곧 말한 날이다.
     *   upsert의 update가 body·writtenBy·writtenOn을 전부 되돌린다.
     *   심사자가 시드 편지를 고쳤어도 [처음 상태로 되돌리기]가 원문을 복구한다.
     */
    if (item.quote !== null) {
      const letterData = {
        body: item.quote,
        writtenBy: item.by ?? ("CHILD" as const),
        writtenOn: new Date(item.madeOn),
      };
      await prisma.letter.upsert({
        where: { id: seedLetterId(item.file) },
        create: { id: seedLetterId(item.file), artworkId: id, origin: "SEED", ...letterData },
        update: letterData,
      });
    }
  }

  return prisma.artwork.count({ where: { origin: "SEED" } });
}
