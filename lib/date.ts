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

/**
 * 🔑 여기서부터는 madeOn과 다루는 값이 다르다.
 *   madeOn은 date 컬럼이라 시각이 없고, 그래서 위쪽을 UTC로 고정했다.
 *   반면 createdAt·occurredAt은 **진짜 시각**이다. 이걸 UTC로 보여주면
 *   한국 사용자에게 9시간 전으로 보이고, 자정 근처에서는 날짜까지 하루 밀린다.
 *   그래서 시간대를 Asia/Seoul로 **명시**한다 — 컨테이너 TZ에 기대지 않는다.
 *   기대면 다른 환경에서 조용히 다른 값이 나오고, 그건 화면에서 티가 안 난다.
 */
const KO_MOMENT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  /**
   * 🔑 24시간제로 고정한 이유는 취향이 아니다.
   *   12시간제로 두면 오전/오후를 로케일 데이터가 붙이는데, Node의 ICU 구성에 따라
   *   한글 날짜 옆에 "PM"이 영문으로 나온다 — 실제로 "2026년 8월 3일 PM 5:54"가 찍혔다.
   *   실행 환경마다 다른 글자가 나오는 것을 화면에서 알아채기 어렵다.
   *   24시간제는 그 변수를 없애고, 이력처럼 순서를 읽는 자리에서는 더 잘 읽힌다.
   */
  hour12: false,
  timeZone: "Asia/Seoul",
});

const KO_DAY = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

/** "2026년 8월 3일 오후 5:55" — 이력처럼 언제인지가 중요한 자리에 쓴다. */
export function formatMoment(date: Date): string {
  return KO_MOMENT.format(date);
}

/** "2026년 8월 3일" — 시각까지는 필요 없는 자리에 쓴다. */
export function formatDay(date: Date): string {
  return KO_DAY.format(date);
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
