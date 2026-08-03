/**
 * 날짜 표시·입력 헬퍼.
 *
 * 🔑 전부 UTC로 다루는 이유
 *   madeOn은 Postgres의 date 컬럼이다. 시각이 없다. Prisma는 이걸 JS Date로 주는데
 *   그 값은 "그 날짜의 UTC 자정"이다. 이걸 한국 시간대로 포맷하면 +9시간이 되어
 *   같은 날 오전 9시가 되므로 날짜는 안 밀린다. 하지만 UTC보다 뒤에 있는 시간대
 *   (예: 미국)에서 열면 하루 전으로 밀린다.
 *   "언제 그렸나"에 시·분은 의미가 없으므로, 저장도 표시도 UTC로 고정해 아예 밀 일을 없앤다.
 */

import { getNow } from "./now";

const KO = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** "2026년 7월 19일" */
export function formatMadeOn(date: Date): string {
  return KO.format(date);
}

/** <input type="date">가 요구하는 "2026-07-19" */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * 등록 폼의 "만든 날" 기본값 = 오늘.
 *
 * 🔑 여기서 new Date()를 그냥 쓰면 안 된다.
 *   한국 시간 8월 3일 새벽 1시는 UTC로 8월 2일 16시다. UTC 기준으로 날짜를 뽑으면
 *   전날이 된다. 아이가 오늘 그린 그림이 어제 날짜로 저장되는 버그가 된다.
 *   그래서 컨테이너의 지역 시간(TZ=Asia/Seoul) 기준으로 연·월·일을 읽는다.
 */
export function todayInputValue(now: Date = getNow()): string {
  // "sv-SE"(스웨덴)는 로캘 포맷이 ISO와 같은 YYYY-MM-DD다. 직접 조립하는 것보다 안전하다.
  return new Intl.DateTimeFormat("sv-SE").format(now);
}

/**
 * "2026-07-19" → 그 날짜의 UTC 자정.
 *
 * new Date("2026-07-19")도 같은 값을 주지만, 브라우저·런타임에 따라 해석이 달라진 전례가 있다.
 * 숫자를 직접 넘겨 해석의 여지를 없앤다.
 */
export function parseDateInputValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;

  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));

  // "2026-02-31"처럼 형식은 맞지만 없는 날짜를 걸러낸다(3월 3일로 굴러가 버린다).
  if (date.getUTCMonth() !== Number(mo) - 1 || date.getUTCDate() !== Number(d)) {
    return null;
  }
  return date;
}
