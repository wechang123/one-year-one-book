/**
 * 편지를 읽는 규칙 — 화면마다 다르면 안 되는 것 두 가지를 여기 둔다.
 *
 * 🔑 순서: **쓴 날 순(writtenOn asc)**이다. 도착한 순서가 곧 "말이 도착한 시점의 지도"다.
 *   같은 날 두 통이면 먼저 저장한 것이 앞이다(createdAt).
 *   화면마다 축이 다르면 같은 작품의 편지가 화면마다 다른 순서로 읽힌다.
 *
 * 🔑 첫 통이 "그때의 말"이다. 카드·책·달력처럼 **한 통만 실을 수 있는 자리**는
 *   전부 첫 통을 싣는다 — 이 서비스가 지키겠다고 한 것이 "그 자리에서 안 받으면
 *   사라지는 말"이라, 대표 한 통을 골라야 한다면 가장 그때에 가까운 것이어야 한다.
 */

import { describeGap } from "./age";

/** Prisma orderBy에 그대로 넣는 값. 편지를 읽는 모든 쿼리가 이걸 쓴다. */
export const LETTER_ORDER = [{ writtenOn: "asc" }, { createdAt: "asc" }] as const;

/**
 * 만든 날과 쓴 날의 간격을 사람이 부르는 말로. `7년 뒤에`, `3개월 뒤에`.
 *
 * 🔑 같은 날이면 null — 그때 받은 말에는 아무 표식도 안 붙는다.
 *   지금까지의 모든 말이 그랬으므로, 표식은 **간격이 생겼을 때만** 정보가 된다.
 *
 * 🔑 경계(100일·24개월)는 lib/age.ts의 describeGap이 정한다. 새로 발명하지 않는다.
 *
 * 🔑 쓴 날이 만든 날보다 앞설 수도 있다 — 물건이 도착하기 전에 쓴 태담 같은 경우다.
 *   드물지만 막을 근거가 없고, 막지 않으면 부르는 말이 있어야 한다: `N일 전에`.
 */
export function letterTiming(madeOn: Date, writtenOn: Date): string | null {
  const after = describeGap(madeOn, writtenOn);
  if (after) return `${after} 뒤에`;
  const before = describeGap(writtenOn, madeOn);
  if (before) return `${before} 전에`;
  return null;
}
