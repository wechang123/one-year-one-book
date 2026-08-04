/**
 * 말의 주인을 폼에서 읽고, 서버가 아는 사실로 확정한다.
 *
 * 🔑 등록과 편집이 같은 것을 써야 한다.
 *   한쪽만 고치면 **편집으로 우회해 태아가 말을 한 기록**을 만들 수 있다.
 *   날짜 검사(미래 날짜 금지)를 두 액션에 똑같이 둔 것과 같은 이유다.
 */

import { couldHaveSpoken, type Birth } from "./age";

export type Speaker = "CHILD" | "PARENT";

/** 폼 값을 읽는다. 모르는 값이 오면 아이로 본다 — 이 서비스의 기본이 아이 말이다. */
export function readQuoteBy(raw: FormDataEntryValue | null): Speaker {
  return raw === "PARENT" ? "PARENT" : "CHILD";
}

/**
 * 화면이 무엇을 보냈든, **태어나기 전이면 부모의 말이다.**
 *
 * 🔑 화면에서 막은 것은 방어가 아니다. 서버 액션은 폼을 거치지 않고도 호출된다.
 *   그리고 이건 앱이 **확실히 아는** 사실이라 서버가 정해도 된다 —
 *   반대로 *"태어난 뒤에 이 아이가 말을 하는가"*는 앱이 모르므로 건드리지 않는다.
 */
export function settleQuoteBy(picked: Speaker, madeOn: Date, birth: Birth): Speaker {
  return couldHaveSpoken(madeOn, birth) ? picked : "PARENT";
}
