"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseDateInputValue, todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { isNotFound, logError } from "@/lib/prisma-error";

/**
 * 아이 정보 — 이름과 두 날짜.
 *
 * 🔴 **생년월일을 받기로 한 것이 이번 확장에서 뒤집은 판단이다.**
 *   전에는 안 받았다. 이유가 있었다 — *"표시하면 다음 요구가 정해져 있다:
 *   이 나이면 보통 어느 정도 그리나요?"* 그 질문에 답할 수 없고, 답하지 않으면
 *   화면이 나이를 왜 물었는지 설명 못 한다는 것이었다.
 *
 *   그 판단은 **날짜의 쓸모가 "나이 표시" 하나뿐일 때** 맞았다.
 *   지금은 초음파 사진부터 받는다. 임신은 주차, 영아는 개월, 그 뒤는 나이로 부르는데
 *   **그 셋 다 이 두 날짜에서만 나온다.** 안 받으면 사용자가 한 점마다 직접 정해야 하고,
 *   그러면 30초 등록이 무너진다.
 *
 *   그래서 **받되, 원래 걱정했던 질문에는 화면이 직접 답한다** — 또래와 비교하지 않는다고,
 *   그리고 왜 그러지 않는지를 이 화면이 말한다(page.tsx). 피하는 대신 답하기로 한 것이다.
 */

const NAME_MAX = 20;

export type ChildState = {
  error?: string;
  field?: "childName" | "dueOn" | "bornOn";
  values?: { childName: string; dueOn: string; bornOn: string };
};

/** 빈 칸은 "모른다"다. 지우는 것도 정상적인 입력이라 오류로 보지 않는다. */
function readOptionalDate(raw: FormDataEntryValue | null): { ok: true; value: Date | null } | { ok: false } {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text === "") return { ok: true, value: null };
  const parsed = parseDateInputValue(text);
  return parsed ? { ok: true, value: parsed } : { ok: false };
}

export async function updateChild(_prev: ChildState, formData: FormData): Promise<ChildState> {
  const childName = String(formData.get("childName") ?? "").trim();
  const dueRaw = formData.get("dueOn");
  const bornRaw = formData.get("bornOn");

  const values = {
    childName,
    dueOn: typeof dueRaw === "string" ? dueRaw : "",
    bornOn: typeof bornRaw === "string" ? bornRaw : "",
  };

  if (childName === "") {
    return { error: "아이를 부를 이름을 적어주세요. 책 표지에 들어갑니다.", field: "childName", values };
  }
  if (childName.length > NAME_MAX) {
    return { error: `이름이 너무 깁니다. ${NAME_MAX}자까지 들어갑니다.`, field: "childName", values };
  }

  const due = readOptionalDate(dueRaw);
  if (!due.ok) return { error: "출산예정일을 확인해주세요. 없는 날짜입니다.", field: "dueOn", values };

  const born = readOptionalDate(bornRaw);
  if (!born.ok) return { error: "태어난 날을 확인해주세요. 없는 날짜입니다.", field: "bornOn", values };

  /**
   * 🔑 태어난 날만 미래를 막는다. 출산예정일은 막지 않는다.
   *   예정일이 미래인 것은 오류가 아니라 **지금 임신 중이라는 뜻**이고,
   *   그게 이 서비스가 새로 받기로 한 시기다. 두 칸에 같은 규칙을 걸면 그 시기를 막게 된다.
   */
  const today = parseDateInputValue(todayInputValue(getNow()));
  if (born.value && today && born.value > today) {
    return { error: "아직 오지 않은 날짜예요. 태어난 뒤에 적어주세요.", field: "bornOn", values };
  }

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!profile) {
    return { error: "아이 정보를 찾지 못했습니다. 컨테이너를 다시 시작하면 초기 데이터가 만들어집니다.", values };
  }

  try {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { childName, dueOn: due.value, bornOn: born.value },
      select: { id: true },
    });
  } catch (e) {
    if (isNotFound(e)) {
      return { error: "아이 정보를 찾지 못했습니다. 목록에서 다시 들어와주세요.", values };
    }
    logError("updateChild", e);
    return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.", values };
  }

  /**
   * 목록으로 보낸다. 이 값이 바뀌면 **목록의 모든 카드에 붙은 시간 축이 같이 바뀌므로**,
   * 저장했다고 말만 하는 것보다 바뀐 결과를 보여주는 편이 확인이 된다.
   */
  redirect("/");
}
