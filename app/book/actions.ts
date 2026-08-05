"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { defaultBookTitle, parseYear, yearRange } from "@/lib/book";
import { isNotFound, isUniqueViolation, logError } from "@/lib/prisma-error";

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
  /**
   * 🔑 작품이 0점인 해는 책이 되지 않는다.
   *   parseYear는 1900~2999를 통과시킨다. 그래서 주소를 손으로 고치면
   *   **작품이 하나도 없는 2019년 책**을 만들 수 있었고, 그 책은 홈의 연도 띠에도
   *   안 나오는데(작품 있는 해만 센다) 주소로는 열렸다.
   *   더 나쁜 건 거기서 **주문까지 접수됐다**는 것이다 —
   *   1권부터 인쇄하는 회사에 **0쪽짜리 주문은 도메인상 의미가 없다.**
   *
   *   화면에서만 막지 않는다. 책 만들기는 폼이 아니라 버튼이라 화면이 개입할 자리가 좁고,
   *   서버 액션은 폼을 거치지 않고도 호출된다.
   */
  const artworks = await prisma.artwork.count({
    where: { profileId: profile.id, madeOn: yearRange(year) },
  });
  if (artworks === 0) {
    return { error: `${year}년에 남긴 것이 없습니다. 한 장 먼저 남겨주세요.` };
  }

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
    } catch (e) {
      /**
       * 🔑 유니크 충돌만 삼킨다. 전에는 catch가 비어 있어 **모든 예외가 통과했다.**
       *   그러면 DB가 끊겨서 create가 실패해도 아래 redirect가 그대로 실행되고,
       *   도착지 /book/[year]는 책이 없으면 notFound()라
       *   사용자는 **"주소가 잘못되었거나 지워진 작품입니다"라는 엉뚱한 404**를 본다.
       *   책을 못 만든 것과 주소가 틀린 것은 사용자가 할 일이 정반대다.
       */
      if (!isUniqueViolation(e)) {
        logError("createBook", e);
        return { error: "책을 만들지 못했습니다. 잠시 뒤 다시 시도해주세요." };
      }
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
  } catch (e) {
    // 없는 책을 고치려 한 것(P2025)과 그 밖의 실패는 사용자가 할 일이 다르다.
    if (isNotFound(e)) return { error: "그 해의 책을 찾지 못했습니다." };
    logError("renameBook", e);
    return { error: "제목을 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요." };
  }

  redirect(`/book/${year}`);
}
