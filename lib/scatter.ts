/**
 * 봉투가 공간 어디에 뜨는가 — id에서 결정적으로 나온다.
 *
 * 🔴 랜덤 금지. 새로고침마다 배치가 바뀌면 "아까 그 봉투"를 다시 못 찾는다.
 *   Math.random 대신 id를 해시한다 — 같은 기록은 언제나 같은 자리에 뜬다.
 *   시드 재생성이 몇 번을 돌려도 같은 바이트를 내는 것과 같은 축의 판단이다.
 *
 * 🔑 서버에서 계산해 인라인 스타일로 내려보낸다. 배치에 JS가 필요 없다 —
 *   JS는 궤도(드래그)와 줌(스크롤)만 얹는다. JS가 꺼져도 공간은 뜬다.
 */

export type Spot = {
  /** 컨테이너 중심 기준 가로 오프셋(%). -44 ~ +44 */
  x: number;
  /** 세로 오프셋(%). -36 ~ +36 */
  y: number;
  /** 깊이(px). 음수가 멀다. -480 ~ +160 */
  z: number;
  /** 기울기(deg). -9 ~ +9 */
  rot: number;
};

/**
 * FNV-1a. 의존성 없이 문자열을 32비트로 접는 가장 짧은 길.
 * 암호학적일 필요가 없다 — 필요한 것은 "같은 입력 → 같은 출력"과 고른 흩어짐뿐이다.
 */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function scatterSpot(id: string): Spot {
  const h = fnv1a(id);

  // 비트 구간을 나눠 쓴다. 네 성분이 같은 비트를 보면 x가 큰 봉투는 늘 z도 커진다.
  const u = (h & 0x3ff) / 1023; //  0..9  → x
  const v = ((h >>> 10) & 0x3ff) / 1023; // 10..19 → y
  const w = ((h >>> 20) & 0x3f) / 63; // 20..25 → z
  const r = ((h >>> 26) & 0x3f) / 63; // 26..31 → 기울기

  let x = -44 + u * 88;
  const y = -36 + v * 72;

  // 한가운데는 머리말이 앉는 자리다. 너무 가까운 봉투는 옆으로 민다.
  if (Math.abs(x) < 14 && Math.abs(y) < 12) x = x < 0 ? x - 18 : x + 18;

  return { x, y, z: -480 + w * 640, rot: -9 + r * 18 };
}
