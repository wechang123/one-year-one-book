"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseDateInputValue, todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { isNotFound, logError } from "@/lib/prisma-error";
import { readQuoteBy, settleQuoteBy } from "@/lib/speaker";

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
  values?: { childQuote: string; madeOn: string; quoteBy: "CHILD" | "PARENT" };
};

export async function updateArtwork(
  _prev: EditArtworkState,
  formData: FormData,
): Promise<EditArtworkState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return { error: "어떤 점인지 알 수 없습니다. 목록에서 다시 들어와주세요." };
  }

  const madeOnRaw = formData.get("madeOn");
  const quotePeek = formData.get("childQuote");
  const pickedBy = readQuoteBy(formData.get("quoteBy"));
  const values = {
    childQuote: typeof quotePeek === "string" ? quotePeek : "",
    madeOn: typeof madeOnRaw === "string" ? madeOnRaw : "",
    quoteBy: pickedBy,
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

  const profile = await prisma.profile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { dueOn: true, bornOn: true },
  });
  const birth = profile ?? { dueOn: null, bornOn: null };

  /**
   * 🔑 이 폼이 고치는 편지는 **첫 통(그때의 말)**이다.
   *   말이 작품당 한 통이던 시절의 폼이라 칸이 하나뿐이고, 그 칸의 상대는
   *   1:N이 된 지금 "가장 그때에 가까운 한 통"이어야 한다. 둘째 통부터는
   *   상세 화면의 편지 목록에서 통별로 다룬다.
   *
   * 🔑 쓴 날이 만든 날을 따라가는 조건이 하나 있다 —
   *   **첫 통의 writtenOn이 옛 madeOn과 같을 때**다. 그 편지는 "내밀던 순간에
   *   받은 말"이라 두 날짜가 같은 순간을 가리키고 있고, 날짜 오타를 고치는 것은
   *   그 순간을 옮기는 것이지 편지를 딴 날로 보내는 것이 아니다.
   *   이미 갈라져 있던 writtenOn(나중에 쓴 편지)은 건드리지 않는다.
   */
  try {
    await prisma.$transaction(async (tx) => {
      /**
       * 옛 madeOn이 필요해서 **고치기 전에 읽는다.** update는 새 값만 돌려주므로
       * "첫 통이 옛 만든 날에 쓰인 것이었나"를 update 뒤에는 판정할 수 없다.
       * 같은 트랜잭션 안이라 읽기와 쓰기 사이에 다른 손이 끼지 않는다.
       */
      const before = await tx.artwork.findUniqueOrThrow({
        where: { id },
        select: {
          madeOn: true,
          letters: {
            orderBy: [{ writtenOn: "asc" }, { createdAt: "asc" }],
            take: 1,
            select: { id: true, writtenOn: true },
          },
        },
      });

      await tx.artwork.update({ where: { id }, data: { madeOn }, select: { id: true } });

      const first = before.letters[0];

      if (quote === "") {
        /**
         * 칸을 비우면 첫 통을 지운다 — 옛 childQuote = null과 같은 뜻이다.
         * 시드 편지였다면 [처음 상태로 되돌리기]가 원문을 복구한다(lib/seed-data.ts).
         */
        if (first) await tx.letter.delete({ where: { id: first.id } });
        return;
      }

      if (first) {
        const wasThatMoment = first.writtenOn.getTime() === before.madeOn.getTime();
        const writtenOn = wasThatMoment ? madeOn : first.writtenOn;
        /**
         * 🔑 말의 주인을 여기서도 다시 확정한다 — 기준은 **쓴 날**이다.
         *   등록에만 두면 편집으로 우회해 "태아가 한 말"을 만들 수 있다.
         */
        await tx.letter.update({
          where: { id: first.id },
          data: { body: quote, writtenBy: settleQuoteBy(pickedBy, writtenOn, birth), writtenOn },
        });
      } else {
        // 비어 있던 자리에 채우는 말은 그때의 말이다 — 쓴 날 = 만든 날.
        await tx.letter.create({
          data: {
            artworkId: id,
            body: quote,
            writtenBy: settleQuoteBy(pickedBy, madeOn, birth),
            writtenOn: madeOn,
            origin: "USER",
          },
        });
      }
    });
  } catch (e) {
    /**
     * 🔑 원인이 다르면 문구도 달라야 한다.
     *   전에는 어떤 실패든 "이미 지워진 작품입니다"라고 말했다.
     *   DB가 끊겨서 실패해도 그렇게 말했고, 사용자는 지워지지도 않은 작품을
     *   **목록에서 찾지 않게 된다.** 틀린 원인을 알려주면 틀린 행동을 한다.
     */
    if (isNotFound(e)) {
      return { error: "이미 지워진 기록입니다. 목록에서 다시 확인해주세요.", values };
    }
    logError("updateArtwork", e);
    return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.", values };
  }

  // 고친 결과를 바로 보여준다. 저장했다고 말만 하면 반영됐는지 확인하러 또 눌러야 한다.
  redirect(`/artwork/${id}`);
}
