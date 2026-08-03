"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { defaultBookTitle, parseYear } from "@/lib/book";

/**
 * 책 만들기 / 표지 제목 고치기.
 *
 * 🔑 책 만들기가 폼이 아니라 버튼 하나인 이유
 *   제목을 먼저 받으면 "무엇을 만드는지 모르는 상태에서 이름부터 지으라"는 요구가 된다.
 *   기본 제목을 제안해 먼저 만들고, 표지를 보면서 고치게 한다.
 *   도달 경로도 짧아진다 — 책 만들기(버튼 1) → 주문(폼 1) → 상태 변경(버튼 1).
 */

/** 제목을 비워두거나 지나치게 길게 넣는 것만 막는다. 나머지는 부모의 말이다. */
const TITLE_MAX = 60;

export type BookActionState = { error?: string };

export async function createBook(_prev: BookActionState, formData: FormData): Promise<BookActionState> {
  const year = parseYear(String(formData.get("year") ?? ""));
  if (year === null) return { error: "어느 해의 책인지 알 수 없습니다." };

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!profile) return { error: "아이 정보를 찾지 못했습니다. 컨테이너를 다시 시작하면 초기 데이터가 만들어집니다." };

  /**
   * 🔑 이미 있으면 오류가 아니라 그 책으로 보낸다.
   *   책은 @@unique([profileId, year])라 한 해에 한 권이다. 두 번 눌리면 두 번째는 실패하는데,
   *   사용자가 원한 결과("2026년 책을 본다")는 두 경우 모두 같다.
   *   "이미 있습니다"라고 막으면 사용자가 할 일이 하나 늘 뿐이다.
   *   DB의 제약을 오류로 노출하지 않고 **원하는 자리로 데려다주는 쪽**을 골랐다.
   */
  const existing = await prisma.collection.findUnique({
    where: { profileId_year: { profileId: profile.id, year } },
    select: { id: true },
  });

  if (!existing) {
    try {
      await prisma.collection.create({
        data: {
          profileId: profile.id,
          year,
          title: defaultBookTitle(profile.childName, year),
          origin: "USER",
        },
      });
    } catch {
      // 위 조회와 이 생성 사이에 다른 요청이 먼저 만들었다. @@unique가 잡아준 것이고,
      // 결과는 "그 해의 책이 있다"로 같다. 그대로 진행한다.
    }
  }

  redirect(`/book/${year}`);
}

export async function renameBook(_prev: BookActionState, formData: FormData): Promise<BookActionState> {
  const year = parseYear(String(formData.get("year") ?? ""));
  if (year === null) return { error: "어느 해의 책인지 알 수 없습니다." };

  const title = String(formData.get("title") ?? "").trim();
  if (title === "") return { error: "표지에 넣을 제목을 적어주세요." };
  if (title.length > TITLE_MAX) return { error: `제목이 너무 깁니다. ${TITLE_MAX}자까지 들어갑니다.` };

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!profile) return { error: "아이 정보를 찾지 못했습니다." };

  try {
    await prisma.collection.update({
      where: { profileId_year: { profileId: profile.id, year } },
      data: { title },
      select: { id: true },
    });
  } catch {
    return { error: "그 해의 책을 찾지 못했습니다." };
  }

  redirect(`/book/${year}`);
}
