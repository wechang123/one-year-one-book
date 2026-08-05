"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseDateInputValue, todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { isNotFound, logError } from "@/lib/prisma-error";
import { readQuoteBy, settleQuoteBy } from "@/lib/speaker";

/**
 * 편지 액션 셋 — 더하기 · 고치기 · 지우기.
 *
 * 🔑 셋 다 **쓴 날(writtenOn) 기준으로 말의 주인을 확정한다.**
 *   말을 할 수 있었는가는 물건이 생긴 날이 아니라 말한 날의 사실이다(lib/speaker.ts).
 *   화면이 무엇을 보냈든 서버가 다시 판정한다 — 액션은 폼 없이도 호출된다.
 *
 * 🔑 빈 편지는 만들지 않는다. "말이 아직 없다"는 상태는 편지 0통이 이미 말하고,
 *   빈 통을 허용하면 목록마다 빈 통을 거르는 조건이 생긴다.
 */

export type LetterState = {
  error?: string;
  field?: "body" | "writtenOn";
  values?: { body: string; writtenOn: string; writtenBy: "CHILD" | "PARENT" };
};

/** 세 액션이 같은 검사를 쓴다. 한쪽만 고치면 우회로가 생긴다. */
function readLetterForm(formData: FormData): {
  ok: true;
  body: string;
  writtenOn: Date;
  picked: "CHILD" | "PARENT";
  values: NonNullable<LetterState["values"]>;
} | { ok: false; state: LetterState } {
  const bodyRaw = formData.get("body");
  const writtenOnRaw = formData.get("writtenOn");
  const picked = readQuoteBy(formData.get("writtenBy"));
  const values = {
    body: typeof bodyRaw === "string" ? bodyRaw : "",
    writtenOn: typeof writtenOnRaw === "string" ? writtenOnRaw : "",
    writtenBy: picked,
  };

  const body = values.body.trim();
  if (body === "") {
    return {
      ok: false,
      state: { error: "편지가 비어 있어요. 한 줄이면 됩니다.", field: "body", values },
    };
  }

  const writtenOn = parseDateInputValue(values.writtenOn);
  if (!writtenOn) {
    return {
      ok: false,
      state: { error: "쓴 날을 확인해주세요. 없는 날짜입니다.", field: "writtenOn", values },
    };
  }

  // 등록·편집의 만든 날과 같은 규칙 — 미래에 쓴 편지는 없다.
  const today = parseDateInputValue(todayInputValue(getNow()));
  if (today && writtenOn > today) {
    return {
      ok: false,
      state: { error: "아직 오지 않은 날짜예요. 쓴 날을 다시 확인해주세요.", field: "writtenOn", values },
    };
  }

  return { ok: true, body, writtenOn, picked, values };
}

async function birthOfFirstProfile() {
  const profile = await getPrisma().profile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { dueOn: true, bornOn: true },
  });
  return profile ?? { dueOn: null, bornOn: null };
}

export async function addLetter(_prev: LetterState, formData: FormData): Promise<LetterState> {
  const artworkId = formData.get("artworkId");
  if (typeof artworkId !== "string" || artworkId === "") {
    return { error: "어느 기록에 붙는 편지인지 알 수 없습니다. 다시 들어와주세요." };
  }

  const read = readLetterForm(formData);
  if (!read.ok) return read.state;

  const prisma = getPrisma();
  const birth = await birthOfFirstProfile();

  try {
    await prisma.letter.create({
      data: {
        artworkId,
        body: read.body,
        writtenBy: settleQuoteBy(read.picked, read.writtenOn, birth),
        writtenOn: read.writtenOn,
        // [데모 초기화]가 지울 대상. 시드 작품에 얹어도 시드는 다치지 않는다.
        origin: "USER",
      },
      select: { id: true },
    });
  } catch (e) {
    logError("addLetter", e);
    return {
      error: "편지를 남기지 못했습니다. 잠시 뒤 다시 시도해주세요.",
      values: read.values,
    };
  }

  redirect(`/artwork/${artworkId}`);
}

export async function updateLetter(_prev: LetterState, formData: FormData): Promise<LetterState> {
  const id = formData.get("letterId");
  if (typeof id !== "string" || id === "") {
    return { error: "어느 편지인지 알 수 없습니다. 다시 들어와주세요." };
  }

  const read = readLetterForm(formData);
  if (!read.ok) return read.state;

  const prisma = getPrisma();
  const birth = await birthOfFirstProfile();

  let artworkId: string;
  try {
    const updated = await prisma.letter.update({
      where: { id },
      data: {
        body: read.body,
        writtenBy: settleQuoteBy(read.picked, read.writtenOn, birth),
        writtenOn: read.writtenOn,
      },
      select: { artworkId: true },
    });
    artworkId = updated.artworkId;
  } catch (e) {
    if (isNotFound(e)) {
      return { error: "이미 지워진 편지입니다. 기록에서 다시 확인해주세요.", values: read.values };
    }
    logError("updateLetter", e);
    return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.", values: read.values };
  }

  redirect(`/artwork/${artworkId}`);
}

/**
 * 편지 지우기.
 *
 * 🔴 이 저장소는 지금까지 삭제를 만들지 않았다 — 작품은 실물의 기록이라
 *   지우면 (실물을 이미 버린 경우) 돌아올 길이 없다. 편지는 두 가지가 다르다:
 *   ① 편집이 이미 본문 전체 덮어쓰기를 허용한다 — 덮어쓸 수 있는데 지울 수 없다는 건
 *     보호가 아니라 모순이다(본문을 공백으로 바꾸는 것을 막을 방법이 없다).
 *   ② 잘못 붙은 편지(엉뚱한 작품에 남긴 말)는 은유로 설명이 안 되는 소음인데,
 *     정리할 길이 [데모 초기화]뿐이면 편지 하나 때문에 전부를 되돌려야 한다.
 *
 * 🔑 대신 **확인이 두 단계다.** 편집 화면의 [지우기]는 먼저 무엇이 사라지는지
 *   본문째 보여주는 확인 화면(?del=1)으로 가고, 거기서 한 번 더 눌러야 지워진다.
 *   JS confirm()이 아니라 화면이다 — JS 없이 동작하고, 지워질 내용이 눈앞에 있다.
 */
export async function deleteLetter(formData: FormData): Promise<void> {
  const id = formData.get("letterId");
  if (typeof id !== "string" || id === "") redirect("/");

  const prisma = getPrisma();
  let artworkId = "";
  try {
    const gone = await prisma.letter.delete({ where: { id }, select: { artworkId: true } });
    artworkId = gone.artworkId;
  } catch (e) {
    // 이미 없는 편지를 지우는 것은 결과가 같다. 오류 화면 대신 기록으로 돌려보낸다.
    if (!isNotFound(e)) {
      logError("deleteLetter", e);
    }
  }

  redirect(artworkId ? `/artwork/${artworkId}` : "/");
}
