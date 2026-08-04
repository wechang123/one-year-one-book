import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { isOngoing } from "@/lib/book";
import { BooksStrip, type YearRow } from "../books-strip";
import { Package } from "../icons";

/**
 * 책 — v2에서 독립 화면이 됐다.
 *
 * 🔴 v1에서는 홈 격자 **아래에 붙은 줄**이었다. 그 자리는 근거가 있었다 —
 *   *"이 서비스의 주인공은 콘텐츠고 책은 그걸 활용하는 쪽이라, 화면에서 먼저 보이면 안 된다."*
 *
 * 🔑 그 근거는 **화면이 하나였을 때**의 것이다.
 *   지금은 사이드바에 다섯 칸이 있고, 그중 앞의 넷(타임라인·캘린더·모아보기·되짚어보기)이
 *   전부 콘텐츠를 보는 화면이다. **책이 다섯째에 있다는 것 자체가 순서를 말한다.**
 *   홈 아래에 붙어 있는 것보다, 넷 다음의 다섯째인 편이 더 정확한 자리다.
 *
 * 🔑 주문도 여기로 모았다. v1에서는 주문 목록으로 가는 길이
 *   *"주문이 1건 이상일 때만 홈의 책 줄 제목에 링크가 붙는" 것* 하나였다.
 *   책과 주문은 같은 일의 앞뒤라 한 화면에서 이어지는 편이 찾기 쉽다.
 */
export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });

  const [madeOn, books, orderCount] = await Promise.all([
    prisma.artwork.findMany({
      where: profile ? { profileId: profile.id } : undefined,
      select: { madeOn: true },
    }),
    prisma.collection.findMany({
      where: profile ? { profileId: profile.id } : undefined,
      select: { year: true, title: true },
    }),
    prisma.order.count({
      where: profile ? { collection: { profileId: profile.id } } : undefined,
    }),
  ]);

  const byYear = new Map<number, number>();
  for (const a of madeOn) {
    const y = a.madeOn.getUTCFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }

  const titleOf = new Map(books.map((b) => [b.year, b.title]));
  const rows: YearRow[] = [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, count]) => ({
      year,
      count,
      ongoing: isOngoing(year),
      bookTitle: titleOf.get(year) ?? null,
    }));

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__text">
          <p className="masthead__meta">한 해가 한 권</p>
          <h1 className="masthead__title">책</h1>
          <p className="masthead__lede">
            남긴 것은 <strong>만든 날의 연도</strong>를 보고 그 해의 책에 저절로 담깁니다.
            고를 것이 없습니다.
          </p>
        </div>

        {orderCount > 0 ? (
          <Link href="/orders" className="btn btn--ghost">
            <Package />주문 {orderCount}건
          </Link>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <div className="blank">
          <h2 className="blank__title">묶을 것이 아직 없어요.</h2>
          <p className="blank__body">
            한 점 남기면 그 해의 책이 생깁니다. <strong>책이 먼저가 아니라 기록이 먼저입니다.</strong>
          </p>
          <Link href="/artwork/new" className="btn">
            첫 한 점 남기기
          </Link>
        </div>
      ) : (
        <BooksStrip rows={rows} />
      )}
    </div>
  );
}
