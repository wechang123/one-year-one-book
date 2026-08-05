/**
 * 봉투를 구(sphere) 표면에 고르게 놓고, 회전시켜 화면에 투영한다.
 *
 * 🔴 전신은 lib/scatter.ts(평면 흩어짐 + id 해시 고정 좌표)였다.
 *   "편지가 너무 고정값"이라는 피드백으로 뒤집었다 — 자리가 고정이면 공간이 아니라
 *   배경화면이다. 구는 **전체가 한 몸으로 돈다**: 자리는 분포가 정하고,
 *   무엇이 앞에 오는지는 손(드래그)이 정한다.
 *
 * 🔑 그래도 랜덤은 아니다. 피보나치 구는 (몇 번째, 전체 몇 개)만으로 정해지는
 *   결정적 분포다 — 같은 목록이면 새로고침해도 같은 배치다. 좁히면(침·검색)
 *   남은 봉투들이 다시 고르게 퍼진다. 그게 구의 성질이고, 원하던 것이기도 하다 —
 *   3통만 남았는데 열두 자리 중 세 곳에 박혀 있으면 걸러진 게 아니라 비어 보인다.
 *
 * 🔑 3D 변환을 CSS preserve-3d가 아니라 **여기서 직접 투영**한다(회전 행렬 두 개).
 *   이유 둘: ① 글자가 항상 정면을 본다 — CSS로 돌리면 뒷면 봉투가 거울상이 되어
 *   역회전 보정이 따로 필요하다 ② 히트 테스트가 평범한 2D가 된다 — v1 공간에서
 *   z=0 평면이 히트를 먹던 문제(16-letters §3)가 원천적으로 없다.
 */

export type Vec3 = { x: number; y: number; z: number };

/** 황금각. 피보나치 구 분포의 전부다 — 이 각으로 돌며 놓으면 뭉치지 않는다. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** i번째(0부터) / 총 n개일 때의 단위 구면 좌표. */
export function sphereVec(i: number, n: number): Vec3 {
  // 위도: 꼭대기·바닥을 살짝 피한다(0.5 오프셋) — 극점의 봉투는 회전할 때 제자리에서 돈다.
  const y = n === 1 ? 0 : 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * GOLDEN_ANGLE;
  return { x: r * Math.cos(theta), y, z: r * Math.sin(theta) };
}

/**
 * 세계 회전(rx: 위아래 기울기, ry: 좌우 돌리기, 단위 deg)을 적용한 좌표.
 * Ry를 먼저, Rx를 나중에 — 드래그의 가로 이동이 언제나 "지구본 돌리기"로 읽히게.
 */
export function rotate(v: Vec3, rxDeg: number, ryDeg: number): Vec3 {
  const ry = (ryDeg * Math.PI) / 180;
  const rx = (rxDeg * Math.PI) / 180;
  const x1 = v.x * Math.cos(ry) + v.z * Math.sin(ry);
  const z1 = -v.x * Math.sin(ry) + v.z * Math.cos(ry);
  const y2 = v.y * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = v.y * Math.sin(rx) + z1 * Math.cos(rx);
  return { x: x1, y: y2, z: z2 };
}

/**
 * 깊이(z: -1 뒤 ~ +1 앞)를 화면 언어로. 원근 대신 크기·흐림·쌓임 순서로 말한다.
 * 뒤로 갈수록 작고 옅다 — 다만 0.4 밑으로는 안 내려간다. 뒷면도 목록의 일부다.
 */
export function depthCue(z: number): { scale: number; opacity: number; zIndex: number } {
  const t = (z + 1) / 2; // 0(뒤) ~ 1(앞)
  return {
    scale: 0.55 + 0.5 * t,
    opacity: 0.4 + 0.6 * t,
    zIndex: Math.round(t * 200),
  };
}
