/**
 * Pretendard를 이 앱이 쓰는 만큼만 잘라낸다.
 *
 * 실행: `node scripts/subset-font.mjs`
 * 결과: `app/fonts/pretendard-subset.woff2`
 *
 * ─────────────────────────────────────────────────────────────
 * 🔑 왜 저장소 안의 코드가 만드는가
 *   시드 이미지(`scripts/seed-images.mjs`)와 같은 이유다 — **저장소가 자기 자산을
 *   다시 만들 수 있어야 한다.** 어디선가 받은 309KB 바이너리가 왜 그 크기이고
 *   무엇이 들어 있는지 설명할 수 없으면, 그건 설명할 수 없는 채로 실려 있는 것이다.
 *
 * 🔴 이 스크립트는 **원본을 네트워크에서 받는다.**
 *   `⛔ 외부 API 호출 금지`는 **앱이 독립 실행돼야 한다**는 규칙이다.
 *   이 스크립트는 `docker compose up` 경로에 없다 — 결과물(woff2)이 커밋돼 있고
 *   앱은 그 파일만 읽는다. `npm install`이 네트워크를 쓰는 것과 같은 층위다.
 *
 *   원본을 같이 커밋하지 않은 이유: 2,009KB를 저장소에 두고 **한 번도 서빙하지 않는다.**
 *   대신 버전을 URL에 박아서(v1.3.9) 언제 돌려도 같은 입력이 들어오게 했다.
 *
 * 🔑 둘 다 SIL OFL 1.1이다 — 자유롭게 서브셋·재배포할 수 있고, 라이선스 전문을 같이 실어야 하며
 *   예약 글꼴 이름을 바꾸지 않아야 한다.
 *   전문: `licenses/pretendard-OFL.txt` · `licenses/gowun-batang-OFL.txt`
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";

/**
 * 자를 글꼴 둘.
 *
 * 🔑 **본문은 산세리프, 표제는 명조다.** 둘을 섞는 이유는 v3의 전부다 —
 *   화면이 *"읽는 곳"*과 *"부르는 곳"*으로 갈린다. 아이 말과 날짜는 읽는 글이고,
 *   `타임라인`·`2026년`·`하늘의 2020년`은 그 글에 붙는 이름이다.
 *   이름이 본문과 같은 활자면 이름 노릇을 못 한다.
 *
 * 🔴 원본을 버전/커밋으로 고정한다. `main`을 쓰면 돌릴 때마다 다른 것이 들어온다.
 */
const FONTS = [
  {
    name: "Pretendard",
    role: "본문",
    url:
      "https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9" +
      "/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
    out: "app/fonts/pretendard-subset.woff2",
    // 가변 글꼴이라 축을 좁힌다. 이 앱이 쓰는 굵기가 400·500·600·700이다.
    variationAxes: { wght: { min: 400, max: 700 } },
  },
  {
    name: "Gowun Batang",
    role: "표제",
    /*
     * 🔑 명조 후보 둘을 재고 골랐다 — Gowun Batang **194KB** / Nanum Myeongjo 327KB.
     *   작은 쪽이 마침 typo.love의 부드러운 세리프에 더 가깝다.
     * 🔑 굵기가 하나(Regular)다. 표제에만 쓰고 강조는 크기와 색이 하므로
     *   Bold를 같이 실을 이유가 없다 — 실으면 194KB가 두 배가 된다.
     */
    url:
      "https://raw.githubusercontent.com/google/fonts/main" +
      "/ofl/gowunbatang/GowunBatang-Regular.ttf",
    out: "app/fonts/gowun-subset.woff2",
    variationAxes: undefined,
  },
];

/** 라틴·숫자·기본 문장부호. 날짜와 주문번호가 여기서 나온다. */
const ASCII = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)).join("");

/** 화면에 실제로 쓰는 약물. `·`는 구분자로, `~`는 시기 구간에 쓴다. */
const PUNCT = "·—–…‘’“”「」『』〈〉《》℃％±×÷→←↑↓";

/** 낱자(ㄱ, ㅏ …). 조사 설명이나 입력 중간 상태에서 단독으로 나올 수 있다. */
const JAMO = Array.from({ length: 0x3163 - 0x3131 + 1 }, (_, i) => String.fromCharCode(0x3131 + i)).join("");

/**
 * KS X 1001 완성형 한글 2,350자.
 *
 * 🔑 한글 음절은 전부 11,172자인데 그걸 다 넣으면 1,701KB다. 2,350자면 438KB다.
 *   그 2,350자가 **현대 한국어 표기에 실제로 쓰이는 집합**이고, 표준 문서 교환 부호에서
 *   그렇게 정해져 있다. 우리가 고른 것이 아니라 이미 있는 기준을 쓴다.
 *
 * 🔴 파이썬·자바스크립트의 `euc-kr` 디코더는 대개 CP949(확장 완성형)라
 *   "인코딩되는지"로 거르면 11,172자가 다 통과한다. 실제로 한 번 그렇게 재서
 *   *"서브셋해도 1,701KB"*라는 틀린 값을 얻었다.
 *   그래서 **바이트 구역을 직접 훑는다** — 0xB0A1~0xC8FE가 KS X 1001의 한글 영역이다.
 */
function ksx1001Hangul() {
  const decoder = new TextDecoder("euc-kr", { fatal: true });
  const out = [];
  for (let lead = 0xb0; lead <= 0xc8; lead += 1) {
    for (let trail = 0xa1; trail <= 0xfe; trail += 1) {
      try {
        out.push(decoder.decode(new Uint8Array([lead, trail])));
      } catch {
        // 그 구역의 빈칸. 건너뛴다.
      }
    }
  }
  return out.join("");
}

const hangul = ksx1001Hangul();
if (hangul.length !== 2350) {
  throw new Error(`KS X 1001 음절이 2350자가 아니라 ${hangul.length}자다. 구역 계산을 다시 봐라.`);
}

const text = ASCII + PUNCT + JAMO + hangul;
const kb = (n) => `${Math.round(n / 1024)}KB`;
console.log(`글자 수  ASCII ${ASCII.length} · 약물 ${PUNCT.length} · 낱자 ${JAMO.length} · 한글 ${hangul.length}\n`);

for (const font of FONTS) {
  console.log(`${font.name} (${font.role}) 내려받는 중 …`);
  const response = await fetch(font.url);
  if (!response.ok) throw new Error(`${font.name}을 받지 못했다: HTTP ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());

  const subset = await subsetFont(source, text, {
    targetFormat: "woff2",
    ...(font.variationAxes ? { variationAxes: font.variationAxes } : {}),
  });

  const out = path.join(process.cwd(), font.out);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, subset);

  const pct = Math.round((subset.length / source.length) * 100);
  console.log(`  원본 ${kb(source.length)} → 서브셋 ${kb(subset.length)} (${pct}%)  → ${font.out}\n`);
}

/**
 * 🔑 결과 크기를 여기서 못 박지 않는다. 원본이 바뀌면 값도 바뀌는데,
 *   스크립트에 숫자를 박아두면 **그 숫자가 언제 잰 것인지 알 수 없게 된다.**
 *   README에 적힌 309KB·194KB는 이 설정으로 돌려 나온 값이다.
 */
