import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { isOngoing, parseYear, yearRange } from "@/lib/book";
import { BookTitleForm } from "./title-form";

/**
 * 책 한 권 = 한 해.
 *
 * 🔑 수록작을 조회하지 않고 계산한다.
 *   Artwork에 collectionId가 없다(schema.prisma). 어느 책에 담기는지는 madeOn의 연도가 정한다.
 *   그래서 여기서 하는 일은 "그 해에 만든 작품을 만든 날 순으로 세우는 것"뿐이다.
 *   대가로 "이 작품만 책에서 빼기"는 못 한다. 이 서비스는 한 해를 통째로 남기려고 만들었지
 *   고르려고 만든 게 아니다.
 *
 * 🔑 순서가 목록과 반대다.
 *   목록(홈)은 최신이 위다 — 방금 등록한 것을 확인하러 오기 때문이다.
 *   책은 1월부터다 — 책은 처음부터 읽는 것이고, 이 서비스가 보여주려는 건 **한 해 동안의 변화**다.
 *   1월의 그림과 12월의 그림이 그 순서로 놓여야 자란 게 보인다.
 */
export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearParam } = await params;
  const year = parseYear(yearParam);
  if (year === null) notFound();

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!profile) notFound();

  const range = yearRange(year);

  const [book, artworks] = await Promise.all([
    prisma.collection.findUnique({
      where: { profileId_year: { profileId: profile.id, year } },
      select: { id: true, title: true },
    }),
    prisma.artwork.findMany({
      where: { profileId: profile.id, madeOn: range },
      orderBy: [{ madeOn: "asc" }, { createdAt: "asc" }],
      // 여기서도 사진 바이트는 안 읽는다. <img>가 /api/photo로 따로 받는다.
      select: { id: true, childQuote: true, madeOn: true },
    }),
  ]);

  /**
   * 안 만든 해는 404다. "만들까요?" 화면을 여기 두지 않는다 —
   * 만드는 자리는 홈이고, 화면 두 곳이 같은 일을 하면 어느 쪽이 진짜인지 물어야 한다.
   */
  if (!book) notFound();

  const ongoing = isOngoing(year);

  return (
    <div className="page">
      <nav className="detail__nav">
        <Link href="/" className="btn btn--ghost">
          ← 작품 목록
        </Link>
      </nav>

      <header className="masthead">
        <div className="masthead__text">
          <p className="masthead__owner">{year}년 · 한 해가 한 권</p>
          <h1 className="masthead__title">{book.title}</h1>
          <p className="masthead__lede">
            {ongoing ? (
              <>
                {/*
                  🔑 아직 안 끝난 해다. "10점이 실린 책"이라고 쓰면 그게 최종본처럼 읽힌다.
                    지금 주문해도 되지만, 그게 올해의 전부는 아니라는 걸 화면이 말해야 한다.
                */}
                <strong>아직 진행 중인 해</strong>입니다. 지금까지 {artworks.length}점이 모였고, 앞으로
                등록하는 작품도 이 책에 담깁니다.
              </>
            ) : (
              <>{artworks.length}점이 담긴 한 권입니다.</>
            )}
          </p>
        </div>
        {/*
          [주문하기]는 주문 화면과 같이 들어온다(#7).
          없는 화면으로 가는 링크를 먼저 만들지 않는다 — docs/decisions/02에 적어둔 원칙이다.
        */}
      </header>

      <BookTitleForm year={year} title={book.title} />

      {artworks.length === 0 ? (
        <div className="blank">
          <h2 className="blank__title">{year}년에 등록한 작품이 아직 없어요.</h2>
          <p className="blank__body">
            작품을 등록하면 <strong>만든 날의 연도</strong>를 보고 이 책에 저절로 담깁니다.
          </p>
          <Link href="/artwork/new" className="btn">
            작품 등록하기
          </Link>
        </div>
      ) : (
        <>
          <p className="tally">1월부터 순서대로 {artworks.length}점</p>

          <ul className="grid">
            {artworks.map((artwork) => (
              <li key={artwork.id}>
                <Link href={`/artwork/${artwork.id}`} className="card">
                  <div className="card__frame">
                    <img
                      className="card__img"
                      src={`/api/photo/${artwork.id}`}
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
    </div>
  );
}
