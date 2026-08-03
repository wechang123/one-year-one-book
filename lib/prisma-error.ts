/**
 * Prisma 오류를 코드로 구분한다.
 *
 * 🔑 왜 만들었나
 *   `catch {}`로 에러를 통째로 삼키면 **원인이 다른 실패가 같은 문구를 받는다.**
 *   실제로 그랬다 — 주문 INSERT가 어떤 이유로 실패해도 화면은
 *   "주문번호를 만들지 못했습니다"라고 말했고, 편집이 어떻게 실패하든
 *   "이미 지워진 작품입니다"라고 말했다. **화면이 엉뚱한 범인을 지목한 것이다.**
 *
 *   사용자에게 틀린 원인을 알려주면 사용자는 틀린 행동을 한다 —
 *   지워지지도 않은 작품을 "지워졌구나" 하고 목록에서 찾지 않는다.
 *
 * 🔑 왜 타입을 직접 좁히나
 *   Prisma 7의 오류 클래스를 런타임에서 `instanceof`로 잡으려면 생성된 클라이언트를
 *   불러와야 하는데, 이 파일은 서버 액션·라우트 어디서나 쓰인다.
 *   필요한 건 `code` 하나뿐이라 구조만 확인한다.
 */

/** Prisma가 던지는 오류는 code를 문자열로 들고 있다. */
function codeOf(e: unknown): string | null {
  if (typeof e !== "object" || e === null) return null;
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/** P2002 — 유니크 제약 위반. "이미 있다"는 뜻이고, 대개 오류가 아니라 흐름이다. */
export function isUniqueViolation(e: unknown): boolean {
  return codeOf(e) === "P2002";
}

/** P2025 — 갱신·삭제하려는 행이 없다. */
export function isNotFound(e: unknown): boolean {
  return codeOf(e) === "P2025";
}

/**
 * 서버 로그에 남긴다.
 *
 * 🔑 저장소 전체에 로깅이 0건이었다.
 *   실패해도 어디에도 흔적이 안 남으니, 화면 문구가 틀렸을 때 왜 틀렸는지 알 방법이 없었다.
 *   사용자에게 보여줄 문구와 개발자가 볼 원인은 다른 것이고, 후자를 버릴 이유가 없다.
 */
export function logError(where: string, e: unknown): void {
  const code = codeOf(e);
  console.error(`[${where}]`, code ? `Prisma ${code}` : "", e);
}
