import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";

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

  const [profile, artworks] = await Promise.all([
    prisma.profile.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.artwork.findMany({
      orderBy: [{ madeOn: "desc" }, { createdAt: "desc" }],
      /**
       * 🔑 사진 테이블을 건드리지 않는다.
       *   사진 바이트는 <img src="/api/photo/[작품id]">가 따로 받아온다.
       *   목록 쿼리가 바이트를 끌고 오면 10점만 있어도 매 요청이 1.7MB가 된다.
       */
      select: { id: true, childQuote: true, madeOn: true },
    }),
  ]);

  const owner = profile?.childName;

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
