/**
 * 조사 붙이기.
 *
 * 🔴 왜 필요해졌나
 *   검색 결과 문구가 `"{검색어}"가 들어간 말`이라고 **조사를 하드코딩**하고 있었다.
 *   검색어가 받침으로 끝나면 그대로 비문이 된다 — *"공룡가 들어간 말"*.
 *   화면이 사용자가 친 글자를 되받아 쓰는 자리에서는 조사를 앱이 정해야 한다.
 */

/** 한글 음절은 U+AC00부터 U+D7A3까지 11,172자가 규칙적으로 배열돼 있다. */
const SYLLABLE_FIRST = 0xac00;
const SYLLABLE_LAST = 0xd7a3;

/** 종성(받침) 후보 개수. 없음 1개 + 있음 27개 = 28. 이 주기가 곧 받침 판정이다. */
const FINAL_COUNT = 28;

/**
 * 주격 조사를 고른다. 받침이 있으면 `이`, 없으면 `가`.
 *
 * 🔑 한글이 아니면 **모른다고 답한다(null).**
 *   영문·숫자는 *읽는 소리*가 조사를 정한다 — `1`은 "일"이라 `이`, `2`는 "이"라 `가`다.
 *   글자만 보고는 알 수 없고, 표를 만들면 `dinosaur`처럼 여러 글자로 읽히는 말에서 또 틀린다.
 *   **모르는 것을 그럴듯하게 정하지 않는다.** 부르는 쪽이 조사가 필요 없는 문장으로 바꾼다.
 */
export function subjectParticle(word: string): "이" | "가" | null {
  const last = word.at(-1);
  if (last === undefined) return null;

  const code = last.codePointAt(0);
  if (code === undefined || code < SYLLABLE_FIRST || code > SYLLABLE_LAST) return null;

  return (code - SYLLABLE_FIRST) % FINAL_COUNT === 0 ? "가" : "이";
}
