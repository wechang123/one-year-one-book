/**
 * 시간 축 — "이게 언제였나"를 그 시기 부모가 실제로 쓰는 단위로 부른다.
 *
 * 🔑 왜 날짜만으로는 부족한가
 *   `2018년 9월 12일`은 **몇 번째 검진이었는지, 아이가 몇 개월이었는지**를 말하지 않는다.
 *   그런데 부모가 그 시절을 기억하는 단위는 날짜가 아니다 —
 *   임신은 **주차**, 신생아는 **일**, 영아는 **개월**, 그 뒤로는 **나이**다.
 *   단위가 시기마다 갈아엎히는 것이 이 서비스의 특이한 점이고,
 *   **생일 하나만 알면 그 전부가 파생된다.**
 *
 * 🔑 여기서 판정하지 않는 것
 *   이 파일은 **언제였는지만 부른다.** *"이 나이면 보통 어느 정도"*는 말하지 않는다.
 *   같은 나이라도 아이마다 다르고 그 폭은 넓다. 앱이 기준을 말하면 부모는 그걸 믿고,
 *   **틀렸을 때 대가를 아이가 치른다.** 그래서 축은 있고 잣대는 없다.
 *
 * 🔑 단위 경계는 발명한 값이 아니다.
 *   백일 전에는 부모가 **날로 센다**(백일이라는 말 자체가 그 증거다).
 *   그 뒤로는 개월로 부르고, 어린이집도 개월로 반을 나눈다.
 *   두 돌쯤부터 나이로 부르기 시작한다. 화면은 그 부르는 법을 따라갈 뿐이다.
 */

import { formatMadeOn } from "./date";

const DAY = 24 * 60 * 60 * 1000;

/** 만삭. 출산예정일이 곧 40주 0일이라는 것이 예정일 계산의 정의다. */
const TERM_DAYS = 280;

/** 백일 전에는 날로 센다. */
const DAYS_UNTIL_MONTHS = 100;

/** 두 돌 전에는 개월로 부른다. */
const MONTHS_UNTIL_YEARS = 24;

export type Birth = { dueOn: Date | null; bornOn: Date | null };

export type Timescale = {
  /** 화면에 그대로 쓸 말. `임신 24주 3일` · `생후 12일` · `만 5세 2개월` */
  label: string;
  /** 무슨 축으로 부른 것인지. 화면이 말을 고를 때 쓴다. */
  scale: "prenatal" | "unborn" | "days" | "months" | "years" | "none";
};

/** date 컬럼은 전부 UTC 자정이라 날짜 차이가 정수로 떨어진다. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}

/** 달력 개월 수. 30으로 나누면 "13개월"이 "12개월"로 보이는 날이 생긴다. */
function monthsBetween(from: Date, to: Date): number {
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
}

/**
 * 그날이 아이의 어느 시점이었나.
 *
 * 🔴 생일 정보가 없으면 **없다고 답한다**(`none`). 지어내지 않는다.
 *   두 값이 다 비어 있어도 앱은 그냥 돈다 — 그 자리엔 날짜만 남는다.
 */
export function describeAge(madeOn: Date, birth: Birth): Timescale {
  const { dueOn, bornOn } = birth;

  const bornYet = bornOn !== null && madeOn.getTime() >= bornOn.getTime();

  if (!bornYet) {
    /**
     * 아직 안 태어난 시점이다.
     *
     * 🔑 주차는 **예정일에서만** 나온다. 태어난 날에서 거꾸로 세면
     *   일찍/늦게 태어난 만큼 지난 기록의 주차가 통째로 밀린다(schema.prisma의 dueOn 참조).
     */
    if (dueOn) {
      const toDue = daysBetween(madeOn, dueOn);
      const elapsed = TERM_DAYS - toDue;
      if (elapsed >= 0 && toDue >= 0) {
        const w = Math.floor(elapsed / 7);
        const d = elapsed % 7;
        return { label: d === 0 ? `임신 ${w}주` : `임신 ${w}주 ${d}일`, scale: "prenatal" };
      }
    }

    // 예정일이 없거나 임신 기간 밖이다. 태어나기 전이라는 것까지만 안다.
    if (bornOn || dueOn) return { label: "태어나기 전", scale: "unborn" };
    return { label: formatMadeOn(madeOn), scale: "none" };
  }

  const days = daysBetween(bornOn, madeOn);
  if (days === 0) return { label: "태어난 날", scale: "days" };
  if (days < DAYS_UNTIL_MONTHS) return { label: `생후 ${days}일`, scale: "days" };

  const months = monthsBetween(bornOn, madeOn);
  if (months < MONTHS_UNTIL_YEARS) return { label: `생후 ${months}개월`, scale: "months" };

  const years = Math.floor(months / 12);
  const rest = months % 12;
  return {
    label: rest === 0 ? `만 ${years}세` : `만 ${years}세 ${rest}개월`,
    scale: "years",
  };
}

/**
 * 시간 축을 **세 띠**로 접는다. 화면이 색을 실을 축이다.
 *
 * 🔑 왜 다섯(scale)이 아니라 셋인가
 *   `days`와 `months`는 **부르는 단위만 다르고 같은 시기**다 — 백일 전에는 날로 세고
 *   그 뒤에는 개월로 부르는 것뿐이라, 부모에게 둘은 이어진 한 구간이다.
 *   `prenatal`과 `unborn`도 같다 — 주차를 셀 수 있느냐만 다르고 둘 다 태어나기 전이다.
 *   색은 **부르는 법**이 아니라 **시기**를 가리켜야 한다.
 *
 * 🔑 왜 색을 쓰나
 *   이 서비스가 다루는 것이 8~9년인데, 격자를 내리면 임신에서 초등까지 지나가면서도
 *   화면은 그 이동을 아무것으로도 표시하지 않았다. 색이 장식이 아니라 **축**이 된다.
 *
 * ⛔ 여기서도 잣대는 없다. 띠는 **태어났는가**와 **두 돌을 넘겼는가**로만 갈린다 —
 *   둘 다 날짜가 확정하는 사실이고, 발달 판정이 아니다.
 */
export type TimeBand = "before" | "infant" | "child";

export function timeBand(scale: Timescale["scale"]): TimeBand | null {
  switch (scale) {
    case "prenatal":
    case "unborn":
      return "before";
    case "days":
    case "months":
      return "infant";
    case "years":
      return "child";
    // 생일을 안 넣었으면 축이 없다. 없는 축에 색을 칠하지 않는다.
    default:
      return null;
  }
}

/**
 * 한 구간이 아이의 어느 시절이었나. `임신 14주 5일` · `생후 39일 ~ 생후 6개월`
 *
 * 🔑 양 끝만 부른다. 구간 안을 채우지 않는 이유는 **채울 것이 이미 아래에 있기 때문**이다 —
 *   구간을 여는 제목은 "이 아래가 어느 시절인지"만 말하면 되고,
 *   한 점 한 점이 언제였는지는 각 카드가 자기 자리에서 말한다.
 *
 * 🔑 생일이 없으면 `null`이다. `describeAge`가 그 경우 날짜를 그대로 돌려주는데,
 *   그 날짜는 카드마다 이미 찍혀 있어서 제목이 같은 말을 두 번 하게 된다.
 */
export type SpanEnd = { label: string; band: TimeBand };

/**
 * 🔑 **문자열 하나가 아니라 양 끝을 따로 돌려준다.**
 *   전에는 `임신 32주 5일 ~ 생후 6개월`을 한 덩어리로 넘겼는데, 그러면 화면이
 *   그 줄에 색을 못 입힌다 — 두 끝이 **서로 다른 시기**일 수 있기 때문이다.
 *   한 해가 임신에서 시작해 생후로 끝나는 것이 이 서비스에서는 흔한 일이고,
 *   그 넘어감이야말로 제목이 보여줄 값이다.
 */
export function describeSpan(
  from: Date,
  to: Date,
  birth: Birth,
): { from: SpanEnd; to: SpanEnd | null } | null {
  const a = describeAge(from, birth);
  const b = describeAge(to, birth);
  const ba = timeBand(a.scale);
  const bb = timeBand(b.scale);
  if (ba === null || bb === null) return null;
  return {
    from: { label: a.label, band: ba },
    // 양 끝이 같은 말이면 한 번만 부른다. `임신 14주 5일 ~ 임신 14주 5일`은 말이 안 된다.
    to: a.label === b.label ? null : { label: b.label, band: bb },
  };
}

/**
 * 두 날 사이가 얼마나 벌어졌나. `17일` · `4개월` · `2년 3개월`
 *
 * 🔑 `describeAge`와 다른 일을 한다. 저쪽은 **아이가 몇 살이었나**를 부르고
 *   여기는 **그냥 얼마나 지났나**를 센다. 기준점이 생일이 아니라 아무 날이다.
 *
 * 🔴 그런데 **경계는 저쪽 것을 그대로 쓴다**(100일 · 24개월).
 *   그 값들은 *"백일 전에는 날로 세고, 두 돌쯤부터 나이로 부른다"*는
 *   한국어 관습에서 왔다(위 상수 주석). 관습이 아이 나이에만 걸리는 게 아니라
 *   **얼마나 지났는지를 말할 때도 같은 자리에서 단위가 갈린다** — 세 달 지난 것을
 *   `92일`이라고 부르는 사람은 없다. 새 경계를 발명하지 않고 있는 것을 쓴다.
 *
 * ⛔ 0일이면 `null`이다. `0일 지났습니다`는 화면이 할 말이 아니다.
 */
export function describeGap(from: Date, to: Date): string | null {
  const days = daysBetween(from, to);
  if (days <= 0) return null;
  if (days < DAYS_UNTIL_MONTHS) return `${days}일`;

  const months = monthsBetween(from, to);
  if (months < MONTHS_UNTIL_YEARS) return `${months}개월`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years}년` : `${years}년 ${rest}개월`;
}

/**
 * 이 시점에 말을 할 수 있었나.
 *
 * 🔑 앱이 아는 것은 **태어났는가** 하나다. 그건 날짜가 확정한다.
 *   *"말을 하는가"*는 모른다 — 시작하는 때가 아이마다 다르고,
 *   앱이 정하는 순간 그게 곧 발달 판정이 된다. 그건 이 저장소가 거절한 것이다.
 */
export function couldHaveSpoken(madeOn: Date, birth: Birth): boolean {
  if (birth.bornOn) return madeOn.getTime() >= birth.bornOn.getTime();
  // 태어난 날을 모르면 막지 않는다. 모르는 것으로 사용자를 막지 않는다.
  return true;
}
