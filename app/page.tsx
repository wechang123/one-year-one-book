import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { isOngoing } from "@/lib/book";
import { BooksStrip, type YearRow } from "./books-strip";
import { DemoResetButton } from "./demo/reset-button";

/**
 * 작품 목록 — 이 서비스의 첫 화면.
 *
 * 🔑 이 화면이 5초 안에 해야 하는 일 두 가지
 *   ① 이게 무슨 서비스인지 알린다  → 머리말 두 줄 + 그림이 깔린 격자
 *   ② 다음에 뭘 눌러야 하는지 알린다 → [사진 등록]이 화면에서 가장 뚜렷한 것 하나
 */

// 등록·편집한 결과가 바로 보여야 한다. 캐시된 목록을 보여주면 방금 한 일이 사라진 것처럼 보인다.
export const dynamic = "force-dynamic";

export default async function ArtworkListPage() {
  const prisma = getPrisma();

  /**
   * 🔑 아이를 먼저 찾고, 그 아이의 것만 읽는다.
   *   전에는 artwork.findMany에 where가 없어 **모든 아이의 작품**을 가져오고 있었다.
   *   지금은 아이가 하나뿐이라 화면이 같아 보이지만, schema.prisma의 인덱스는
   *   @@index([profileId, madeOn])로 "이 아이의 작품을 만든 날 역순"을 전제로 깔려 있다.
   *   where가 없으면 그 인덱스를 쓰지 못하고, 무엇보다 **주석이 코드보다 앞서 있는 상태**가 된다.
   *   조회를 두 단계로 나누는 값보다, 화면이 무엇을 보여주는지가 코드에 적혀 있는 값이 크다.
   */
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });

  const [artworks, books, orderCount] = await Promise.all([
    prisma.artwork.findMany({
      where: profile ? { profileId: profile.id } : undefined,
      orderBy: [{ madeOn: "desc" }, { createdAt: "desc" }],
      /**
       * 🔑 사진 테이블을 건드리지 않는다.
       *   사진 바이트는 <img src="/api/photo/[작품id]">가 따로 받아온다.
       *   목록 쿼리가 바이트를 끌고 오면 10점만 있어도 매 요청이 1.7MB가 된다.
       */
      select: { id: true, childQuote: true, madeOn: true },
    }),
    prisma.collection.findMany({
      where: profile ? { profileId: profile.id } : undefined,
      select: { year: true, title: true },
    }),
    prisma.order.count({
      where: profile ? { collection: { profileId: profile.id } } : undefined,
    }),
  ]);

  const owner = profile?.childName;

  /**
   * 🔑 연도별 묶음을 DB에 다시 묻지 않는다.
   *   수록작은 madeOn의 연도로 정해지므로, 방금 받아온 목록에서 세면 답이 나온다.
   *   같은 사실을 두 곳에서 계산하면 두 곳이 갈라진다.
   *   madeOn은 date 컬럼이라 UTC 자정이다 — 연도도 UTC로 읽어야 1월 1일이 옆 해로 안 샌다.
   */
  const byYear = new Map<number, number>();
  for (const a of artworks) {
    const y = a.madeOn.getUTCFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }

  const titleOf = new Map(books.map((b) => [b.year, b.title]));

  const yearRows: YearRow[] = [...byYear.entries()]
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
          {owner ? <p className="masthead__owner">{owner}의 기록</p> : null}
          <h1 className="masthead__title">아이가 만든 것을, 아이의 말과 함께.</h1>
          <p className="masthead__lede">
            한 해가 지나면 한 권으로 묶습니다. 그래서 실물은 마음 편히 정리하셔도 됩니다.
          </p>
        </div>

        {/* 등록은 언제나 열려 있다. 주기·마감 규칙을 만들지 않았다. */}
        <Link href="/artwork/new" className="btn">
          사진 등록
        </Link>
      </header>

      {artworks.length === 0 ? (
        <EmptyList />
      ) : (
        <>
          <p className="tally">작품 {artworks.length}점</p>

          <ul className="grid">
            {artworks.map((artwork) => (
              <li key={artwork.id}>
                <Link href={`/artwork/${artwork.id}`} className="card">
                  <div className="card__frame">
                    <img
                      className="card__img"
                      src={`/api/photo/${artwork.id}`}
                      /*
                       * alt에 아이 말을 넣지 않는다. 그건 그림의 설명이 아니라
                       * 그림을 보고 아이가 한 말이라, 화면에 이미 글로 나와 있다.
                       * 스크린리더가 같은 문장을 두 번 읽게 된다.
                       */
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="card__body">
                    {artwork.childQuote ? (
                      <p className="quote">{artwork.childQuote}</p>
                    ) : (
                      <p className="quote quote--empty">아직 안 물어봤어요</p>
                    )}
                    <time className="card__date" dateTime={artwork.madeOn.toISOString()}>
                      {formatMadeOn(artwork.madeOn)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/*
        🔑 책 줄은 작품 아래다. 위가 아니다.
          이 서비스의 주인공은 **아이가 만든 것과 아이가 한 말**이고,
          책은 그 콘텐츠를 활용하는 쪽이다. 화면에서 먼저 보이는 것이 주인공이라,
          책이 위에 있으면 첫 5초가 "책 만드는 서비스"라고 말한다.

          그렇다고 홈에서 빼지는 않는다. 빼면 책 만들기 → 주문 → 상태 변경으로 가는
          동선이 끊기고, "직접 만들어보라고 비워둔" 시드 배치가 무의미해진다.
          위가 아니라 아래 — 그게 부가 기능의 자리다.
      */}
      <BooksStrip rows={yearRows} orderCount={orderCount} />

      {/*
        🔑 맨 아래에 조용히 둔다.
          처음 여는 사람에게는 필요하고 주 사용자에게는 필요 없는 기능이라,
          찾으면 보이되 먼저 보이지는 않아야 한다.
          그리고 이게 있어야 위의 버튼들이 눌린다 — 되돌릴 수 없으면 아무도 안 눌러본다.
      */}
      <footer className="demo">
        <p className="demo__lede">
          마음껏 등록하고 고치고 주문해 보세요. 언제든 처음 상태로 되돌릴 수 있습니다.
        </p>
        <DemoResetButton />
      </footer>
    </div>
  );
}

/**
 * 빈 목록.
 *
 * 🔑 "작품이 없습니다"로 끝내지 않는다. 빈 화면은 안내할 자리가 가장 넓은 화면이다.
 *   무엇을 하는 곳인지 다시 말하고, 다음 동작 하나만 남긴다.
 */
function EmptyList() {
  return (
    <div className="blank">
      <h2 className="blank__title">아직 남긴 작품이 없어요.</h2>
      <p className="blank__body">
        아이가 그림을 내밀면 사진을 찍고, <strong>그때 아이가 한 말</strong>을 그대로 적어두세요.
        그 말은 그 자리에서 안 물어보면 영영 얻을 수 없습니다.
      </p>
      <Link href="/artwork/new" className="btn">
        첫 작품 등록하기
      </Link>
    </div>
  );
}
