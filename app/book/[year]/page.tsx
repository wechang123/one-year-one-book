import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { isOngoing, parseYear, yearRange } from "@/lib/book";
import { BookTitleForm } from "./title-form";
import { ArrowLeft, Package } from "../../icons";
import { describeAge, timeBand } from "@/lib/age";

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

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ ordered?: string }>;
}) {
  const [{ year: yearParam }, { ordered }] = await Promise.all([params, searchParams]);
  const year = parseYear(yearParam);
  if (year === null) notFound();

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!profile) notFound();

  const range = yearRange(year);

  const [book, artworks, orderCount] = await Promise.all([
    prisma.collection.findUnique({
      where: { profileId_year: { profileId: profile.id, year } },
      select: { id: true, title: true },
    }),
    prisma.artwork.findMany({
      where: { profileId: profile.id, madeOn: range },
      orderBy: [{ madeOn: "asc" }, { createdAt: "asc" }],
      // 여기서도 사진 바이트는 안 읽는다. <img>가 /api/photo로 따로 받는다.
      // 책 카드도 한 통만 싣는 자리 — 첫 통(그때의 말)이 대표다. (lib/letter.ts)
      select: {
        id: true,
        madeOn: true,
        letters: {
          orderBy: [{ writtenOn: "asc" }, { createdAt: "asc" }],
          take: 1,
          select: { body: true },
        },
      },
    }),
    // 이 책에 주문이 몇 건인지. 한 권에 여러 건이 가능하므로 "이미 주문함"이 아니라 건수로 말한다.
    prisma.order.count({ where: { collection: { profileId: profile.id, year } } }),
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
          <ArrowLeft />
          모아보기
        </Link>
      </nav>

      <header className="masthead">
        <div className="masthead__text">
          <p className="masthead__meta meta--label">{year}년 · 한 해가 한 권</p>
          <h1 className="masthead__title">{book.title}</h1>
          <p className="masthead__lede">
            {ongoing ? (
              <>
                {/*
                  🔑 아직 안 끝난 해다. "10점이 실린 책"이라고 쓰면 그게 최종본처럼 읽힌다.
                    지금 주문해도 되지만, 그게 올해의 전부는 아니라는 걸 화면이 말해야 한다.
                */}
                <strong>아직 진행 중인 해</strong>입니다. 지금까지 {artworks.length}점이 모였고, 앞으로
                등록하는 것도 이 책에 담깁니다.
              </>
            ) : (
              <>{artworks.length > 0 ? `${artworks.length}점이 담긴 한 권입니다.` : "아직 담긴 것이 없습니다."}</>
            )}
          </p>
        </div>

        {/*
          🔑 0점이면 주문 버튼을 내린다.
            서버가 거절하는 것을 화면이 권하면, 사용자는 눌러보고 나서야 안 된다는 걸 안다.
            막는 자리와 말하는 자리가 같아야 한다.
        */}
        {artworks.length > 0 ? (
          <Link href={`/book/${year}/order`} className="btn">
            <Package />
            주문하기
          </Link>
        ) : null}
      </header>

      {/*
        🔑 주문번호를 여기서 크게 보여준다.
          "접수되었습니다"만으로는 사용자가 나중에 문의할 때 댈 것이 없다.
          이 번호는 전화로 부를 수 있게 만든 값이라(lib/order-no.ts), 부를 수 있게 보여야 한다.
      */}
      {ordered ? (
        <p className="saved" role="status">
          <strong>주문이 접수됐습니다. 주문번호 {ordered}</strong>
          <span className="saved__sub">
            앞자리 여덟 자리가 주문한 날짜입니다. 문의하실 때 이 번호를 말씀해 주세요.
          </span>
        </p>
      ) : null}

      {orderCount > 0 ? (
        <p className="tally">
          이 책의 주문 {orderCount}건 · <Link href="/orders">주문 목록 보기</Link>
        </p>
      ) : null}

      <BookTitleForm year={year} title={book.title} />

      {artworks.length === 0 ? (
        <div className="blank">
          <h2 className="blank__title">{year}년에 남긴 것이 아직 없어요.</h2>
          <p className="blank__body">
            한 점 남기면 <strong>만든 날의 연도</strong>를 보고 이 책에 저절로 담깁니다.
          </p>
          <Link href="/artwork/new" className="btn">
            한 점 남기기
          </Link>
        </div>
      ) : (
        <>
          <p className="tally">1월부터 순서대로 {artworks.length}점</p>

          <ul className="grid">
            {artworks.map((artwork) => {
              /*
                🔴 여기가 시기 색을 안 쓰고 있었다. 시기 띠(#72)를 넣을 때 **홈 격자만** 손봐서,
                  같은 작품이 홈에서는 청록 틀인데 책에서는 기본 틀이었다.
                  기본값이 `--t-child-fill`이라 **생후 19개월짜리가 책에서는 만 N세 색**으로 보였다.
                  같은 것이 화면마다 다르게 보이면 색이 축 노릇을 못 한다.
              */
              const band = timeBand(
                describeAge(artwork.madeOn, { dueOn: profile.dueOn, bornOn: profile.bornOn }).scale,
              );
              return (
              <li key={artwork.id}>
                <Link
                  href={`/artwork/${artwork.id}`}
                  className={band ? `card card--${band}` : "card"}
                >
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
                    {artwork.letters[0] ? (
                      <p className="quote">{artwork.letters[0].body}</p>
                    ) : (
                      <p className="quote quote--empty">말이 남지 않았어요</p>
                    )}
                    <time className="card__date" dateTime={artwork.madeOn.toISOString()}>
                      {formatMadeOn(artwork.madeOn)}
                    </time>
                  </div>
                </Link>
              </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
