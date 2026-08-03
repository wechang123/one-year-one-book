"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseDateInputValue, todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";

/**
 * 설명 편집 — 아이 말과 만든 날만.
 *
 * 🔑 사진을 바꿀 수 없게 만든 것이 이 화면의 핵심 판단이다.
 *   등록은 아이가 그림을 내미는 30초 안에 끝나야 해서 아이 말을 비운 채로도 저장된다.
 *   나중에 물어본 말을 채우고 날짜 오타를 고치는 것 — 이 둘이 실제로 나중에 바뀌는 값이다.
 *   사진은 그렇지 않다. 잘못 고른 사진은 **등록 화면의 미리보기에서 잡는다**(#3).
 *
 *   그리고 이 결정이 다른 두 곳을 떠받치고 있다:
 *   ① api/photo/[artworkId]/route.ts 의 Cache-Control: immutable
 *      — "이 주소의 바이트는 영원히 안 바뀐다"는 약속이다. 교체가 가능해지면 이 약속이 거짓이 되고,
 *        브라우저는 1년 동안 옛 사진을 보여주면서 재확인할 방법도 없다(ETag가 없다).
 *   ② lib/seed-data.ts 의 photo.upsert.update 에 bytes가 없는 것
 *      — 시드 사진의 바이트를 덮어쓸 경로가 아예 없으므로 되돌릴 일도 없다.
 *
 *   즉 "사진 교체를 넣지 않는다"는 기능을 뺀 게 아니라, 저 두 개를 **성립시키는 전제**다.
 */

export type EditArtworkState = {
  error?: string;
  field?: "madeOn";
  /** 오류로 되돌아왔을 때 고치던 값이 지워지지 않게 그대로 돌려보낸다. */
  values?: { childQuote: string; madeOn: string };
};

export async function updateArtwork(
  _prev: EditArtworkState,
  formData: FormData,
): Promise<EditArtworkState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return { error: "어떤 작품인지 알 수 없습니다. 목록에서 다시 들어와주세요." };
  }

  const madeOnRaw = formData.get("madeOn");
  const quotePeek = formData.get("childQuote");
  const values = {
    childQuote: typeof quotePeek === "string" ? quotePeek : "",
    madeOn: typeof madeOnRaw === "string" ? madeOnRaw : "",
  };
  const madeOn = typeof madeOnRaw === "string" ? parseDateInputValue(madeOnRaw) : null;
  if (!madeOn) {
    return { error: "만든 날을 확인해주세요. 없는 날짜입니다.", field: "madeOn", values };
  }

  // 등록과 같은 규칙이다. 여기만 느슨하면 편집으로 우회해 미래 날짜를 넣을 수 있다.
  const today = parseDateInputValue(todayInputValue(getNow()));
  if (today && madeOn > today) {
    return { error: "아직 오지 않은 날짜예요. 만든 날을 다시 확인해주세요.", field: "madeOn", values };
  }

  const quoteRaw = formData.get("childQuote");
  const quote = typeof quoteRaw === "string" ? quoteRaw.trim() : "";

  const prisma = getPrisma();

  /**
   * 없는 id면 update가 예외를 던진다. 그걸 잡아 화면 문구로 바꾼다.
   * 여기서 findUnique로 먼저 확인하지 않는 이유: 확인과 수정 사이에 지워질 수 있고,
   * 그러면 같은 오류를 두 곳에서 처리하게 된다. 한 번의 update가 답을 다 준다.
   */
  try {
    await prisma.artwork.update({
      where: { id },
      data: {
        childQuote: quote === "" ? null : quote,
        madeOn,
      },
      select: { id: true },
    });
  } catch {
    return { error: "이미 지워진 작품입니다. 목록에서 다시 확인해주세요.", values };
  }

  // 고친 결과를 바로 보여준다. 저장했다고 말만 하면 반영됐는지 확인하러 또 눌러야 한다.
  redirect(`/artwork/${id}`);
}
