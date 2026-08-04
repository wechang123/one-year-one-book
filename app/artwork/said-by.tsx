/**
 * 이 말을 누가 했는지 붙이는 표식.
 *
 * 🔑 **부모의 말일 때만 붙인다.** 이 서비스의 기본은 아이의 말이고,
 *   기본값에 이름표를 달면 열 장짜리 목록이 이름표로 덮인다.
 *   기본이 무엇인지는 화면이 다른 데서 이미 말한다 —
 *   머리말이 *"아이가 남긴 것을, 그때의 말과 함께"*이고 등록 화면이 누구의 말인지 묻는다.
 *
 * 🔑 상세 화면만 예외다. 거기는 한 점만 놓이므로 **둘 다 붙인다** —
 *   자리가 있고, 한 점을 오래 보는 자리라 "이건 누구 말이었지"가 실제로 떠오른다.
 */
/**
 * 말이 비어 있을 때의 문구.
 *
 * 🔴 전에는 어디서나 *"아직 안 물어봤어요"*였다. **물어볼 상대가 없는 시기가 생겼다.**
 *   태아에게 물어봤을 리 없으므로 그 문장은 임신 구간에서 그냥 틀린 말이 된다.
 *   비어 있다는 사실을 숨기지 않는다는 원칙은 그대로 두고, 부르는 말만 시기에 맞춘다.
 */
export function emptyQuoteText(by: "CHILD" | "PARENT"): string {
  return by === "CHILD" ? "아직 안 물어봤어요" : "아직 안 적었어요";
}

export function SaidBy({ by, always = false }: { by: "CHILD" | "PARENT"; always?: boolean }) {
  if (by === "CHILD" && !always) return null;
  return (
    <span className={`saidby saidby--${by === "CHILD" ? "child" : "parent"}`}>
      {by === "CHILD" ? "아이가 한 말" : "부모가 남긴 말"}
    </span>
  );
}
