"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseDateInputValue, todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { isNotFound, logError } from "@/lib/prisma-error";
import { couldHaveSpoken } from "@/lib/age";

/**
 * 작품 편집 — 이제 **만든 날 하나**다.
 *
 * 🔴 이 액션은 세 번 좁아졌다.
 *   ① 처음부터 사진은 못 바꿨다 — 그 판단이 Cache-Control: immutable과
 *     시드 재적용(바이트를 안 덮어쓰는 것)을 떠받친다. 그 근거는 그대로 산다.
 *   ② 말 컬럼이 Letter 테이블로 나가면서 잠깐 "첫 통을 고치는 다리"가 여기 있었다.
 *   ③ 편지에 통별 편집(/letter/[id]/edit)이 생기면서 그 다리를 걷었다 —
 *     같은 편지를 고치는 경로가 둘이면 한쪽만 고쳤을 때 갈라진다.
 *     남은 것은 작품 자신의 값, 만든 날뿐이다.
 *
 * 🔑 만든 날을 고치면 그때의 말(쓴 날 = 옛 만든 날인 편지)의 쓴 날도 따라간다.
 *   날짜 오타를 고치는 것은 그 순간을 옮기는 것이지, 편지를 그 순간에서
 *   떼어내는 것이 아니다. 이미 다른 날에 쓰인 편지는 건드리지 않는다.
 */

export type EditArtworkState = {
  error?: string;
  field?: "madeOn";
  values?: { madeOn: string };
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
  const values = { madeOn: typeof madeOnRaw === "string" ? madeOnRaw : "" };

  const madeOn = typeof madeOnRaw === "string" ? parseDateInputValue(madeOnRaw) : null;
  if (!madeOn) {
    return { error: "만든 날을 확인해주세요. 없는 날짜입니다.", field: "madeOn", values };
  }

  // 등록과 같은 규칙이다. 여기만 느슨하면 편집으로 우회해 미래 날짜를 넣을 수 있다.
  const today = parseDateInputValue(todayInputValue(getNow()));
  if (today && madeOn > today) {
    return { error: "아직 오지 않은 날짜예요. 만든 날을 다시 확인해주세요.", field: "madeOn", values };
  }

  const prisma = getPrisma();

  try {
    await prisma.$transaction(async (tx) => {
      /**
       * 옛 만든 날이 필요해서 고치기 전에 읽는다 — "그때의 말"을 가려내는 기준이다.
       * 같은 트랜잭션 안이라 읽기와 쓰기 사이에 다른 손이 끼지 않는다.
       */
      const before = await tx.artwork.findUniqueOrThrow({
        where: { id },
        select: { madeOn: true },
      });

      await tx.artwork.update({ where: { id }, data: { madeOn }, select: { id: true } });

      // 그 순간에 받은 편지들이 순간과 함께 움직인다.
      await tx.letter.updateMany({
        where: { artworkId: id, writtenOn: before.madeOn },
        data: { writtenOn: madeOn },
      });

      /**
       * 🔑 옮겨진 날이 태어나기 전이면 그 편지들의 주인을 부모로 다시 확정한다.
       *   날짜 오타를 고치다 생일 경계를 넘으면(생후 → 임신) "태아가 한 말"이
       *   남는 구멍이 생긴다 — 등록·편집이 같은 규칙을 타는 것과 같은 이유로 여기서 막는다.
       */
      const profile = await tx.profile.findFirst({
        orderBy: { createdAt: "asc" },
        select: { dueOn: true, bornOn: true },
      });
      if (profile && !couldHaveSpoken(madeOn, profile)) {
        await tx.letter.updateMany({
          where: { artworkId: id, writtenOn: madeOn },
          data: { writtenBy: "PARENT" },
        });
      }
    });
  } catch (e) {
    if (isNotFound(e)) {
      return { error: "이미 지워진 기록입니다. 목록에서 다시 확인해주세요.", values };
    }
    logError("updateArtwork", e);
    return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.", values };
  }

  // 고친 결과를 바로 보여준다. 저장했다고 말만 하면 반영됐는지 확인하러 또 눌러야 한다.
  redirect(`/artwork/${id}`);
}
