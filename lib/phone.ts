/**
 * 연락처.
 *
 * 🔑 검증을 느슨하게 잡은 이유
 *   이 값의 쓸모는 **"주문에 문제가 생겼을 때 연락이 닿는 것"** 하나다.
 *   그런데 형식을 촘촘히 잡을수록 진짜 번호가 거절당한다 — 070·050 안심번호·지역번호·
 *   해외 체류 중인 부모의 번호까지. 거절당한 사람은 형식을 맞추려고 **가짜를 넣는다.**
 *   그러면 검증이 통과한 대신 연락은 안 닿는다. 검증이 목적을 배신하는 경우다.
 *
 *   그래서 숫자 개수만 본다. 자릿수가 아예 안 맞는 것은 오타이거나 다른 값을 넣은 것이고,
 *   그건 사용자가 다시 보면 알 수 있다.
 */

const MIN_DIGITS = 9; // 지역번호 없는 시내번호(02-123-4567)
const MAX_DIGITS = 11; // 010-1234-5678

/** 숫자만 남긴다. */
export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidPhone(raw: string): boolean {
  const n = phoneDigits(raw).length;
  return n >= MIN_DIGITS && n <= MAX_DIGITS;
}

/**
 * 저장할 형태로 다듬는다.
 *
 * 🔑 화면에서 다듬지 않고 저장할 때 다듬는다.
 *   목록·상세 세 화면이 같은 값을 보여줘야 하는데, 화면마다 포맷하면
 *   한 곳을 고칠 때 나머지가 남는다. 들어올 때 한 번 정하면 그 뒤로는 그냥 읽으면 된다.
 */
export function normalizePhone(raw: string): string {
  const d = phoneDigits(raw);

  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10 && d.startsWith("02")) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9 && d.startsWith("02")) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;

  // 위에 안 걸리는 자릿수는 손대지 않는다. 모르는 형태를 임의로 쪼개면 틀린 번호가 된다.
  return d;
}
