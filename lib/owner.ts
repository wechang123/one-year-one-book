import { getPrisma } from "./prisma";

/**
 * 사이드바에 부를 아이 이름.
 *
 * 🔴 **레이아웃에서 DB를 읽는 유일한 자리다.** v1에서는 이걸 금지했는데,
 *   근거가 *"DB가 끊기면 error.tsx조차 못 뜬다"*였다. 그 근거는 지금도 맞다 —
 *   오류 화면이 레이아웃 **안에서** 그려지기 때문에 레이아웃이 던지면 나갈 길이 없어진다.
 *
 * 🔑 그래서 **던지지 않게 만들었다.** 이건 오류를 삼키는 게 아니라
 *   *"이 조회는 실패해도 화면이 성립해야 한다"*는 선언이다 —
 *   이름을 못 읽으면 사이드바가 `아이 정보`라고만 부르고 앱은 그대로 돈다.
 *
 *   삼켜도 되는 이유가 있다: 이 값은 **꾸미는 값**이다. 이름이 없다고 못 하는 일이 없다.
 *   같은 처리를 데이터 조회에 하면 그건 오류를 숨기는 것이다. 여기만 그렇게 둔다.
 *
 * ⚠️ DB가 끊긴 상태를 실제로 만들어 확인한 자리다 — 컨테이너를 내리고 이 화면이
 *   여전히 뜨는지 봤다.
 */
export async function getOwnerName(): Promise<string | null> {
  try {
    const profile = await getPrisma().profile.findFirst({
      orderBy: { createdAt: "asc" },
      select: { childName: true },
    });
    return profile?.childName ?? null;
  } catch {
    return null;
  }
}
