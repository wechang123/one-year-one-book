import { todayInputValue } from "./date";
import { getNow } from "./now";

/**
 * 책 = 한 해.
 *
 * 🔑 수록작을 저장하지 않는다.
 *   어느 작품이 어느 책에 들어가는지는 이미 madeOn의 연도가 정한다(schema.prisma의 Collection).
 *   외래키를 따로 두면 "madeOn은 2026인데 2025년 책에 담긴 작품" 같은 모순이 만들어질 수 있다.
 *   그래서 수록작은 매번 연도로 계산한다. 여기 있는 함수들이 그 계산이다.
 */

/** 지금이 몇 년인가. 컨테이너 시간대(TZ=Asia/Seoul) 기준이다. */
export function currentYear(now: Date = getNow()): number {
  // todayInputValue가 "2026-08-03"을 지역 시간대로 준다. 연도만 떼어낸다.
  return Number(todayInputValue(now).slice(0, 4));
}

/**
 * 한 해의 범위 [1월 1일, 다음 해 1월 1일).
 *
 * 🔑 UTC로 만든다. madeOn이 date 컬럼이라 Prisma가 "그 날짜의 UTC 자정"으로 주고받는다(lib/date.ts).
 *   지역 시간대로 경계를 만들면 1월 1일과 12월 31일이 옆 해로 새어 나간다.
 */
export function yearRange(year: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

/**
 * 표지에 들어갈 기본 제목.
 *
 * 🔑 이름이 여기 쓰인다.
 *   등록할 때 아이 이름을 매번 묻지 않는 대신 Profile에 한 번만 받아둔 이유가 이것이다
 *   (schema.prisma의 Profile). 표지에는 부를 이름이 있어야 한다.
 *   기본값을 제안하되 고칠 수 있게 둔다 — 제목은 부모의 말이지 시스템의 값이 아니다.
 */
export function defaultBookTitle(childName: string, year: number): string {
  return `${childName}의 ${year}년`;
}

/** 주소로 들어온 연도 문자열을 검증한다. 없는 해를 조회하러 DB까지 가지 않는다. */
export function parseYear(value: string): number | null {
  if (!/^\d{4}$/.test(value)) return null;
  const n = Number(value);
  // 아래위 경계는 "아이가 그린 해"로 있을 법한 범위다. 그 밖은 주소를 손으로 고친 것이다.
  if (n < 1900 || n > 2999) return null;
  return n;
}

/**
 * 아직 안 끝난 해인가.
 *
 * 🔑 이 구분이 화면 문구를 바꾼다.
 *   2026년이 진행 중인데 "2026년 · 10점"이라고만 쓰면 그게 최종 수록작처럼 읽힌다.
 *   지어낸 완결감을 만들지 않는다 — 지금까지 몇 점인지로 말한다.
 */
export function isOngoing(year: number, now: Date = getNow()): boolean {
  return year >= currentYear(now);
}
