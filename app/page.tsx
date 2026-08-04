import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { isOngoing } from "@/lib/book";
import { subjectParticle } from "@/lib/korean";
import { describeAge, describeSpan } from "@/lib/age";
import { groupByYear } from "@/lib/group";
import { SaidBy, emptyQuoteText } from "./artwork/said-by";
import { Camera, Search } from "./icons";
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

/**
 * 검색어에서 매칭된 부분을 강조한다.
 *
 * 🔑 강조가 없으면 **왜 찾혔는지 모른다.**
 *   말이 두세 문장짜리라 결과만 보면 어느 낱말이 걸렸는지 안 보이고,
 *   그러면 사용자는 검색이 제대로 동작했는지 판단할 수 없다.
 */
function highlight(text: string, q: string) {
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let from = 0;
  for (;;) {
    const at = lower.indexOf(needle, from);
    if (at === -1) break;
    if (at > from) out.push(text.slice(from, at));
    out.push(<mark key={at}>{text.slice(at, at + q.length)}</mark>);
    from = at + q.length;
  }
  out.push(text.slice(from));
  return out;
}

/**
 * 검색어를 문장의 주어 자리에 놓는다. `"공룡"이` · `"이불"이` · `"바다"가`.
 *
 * 🔑 조사를 모르는 검색어(영문·숫자·이모지)는 **조사가 필요 없는 모양**으로 바꾼다.
 *   `"dino", 이 낱말이 …`. 앱이 발음을 지어내는 것보다 문장을 바꾸는 쪽이 정직하다.
 *   `말`이 아니라 `낱말`인 이유는 뒤에 오는 문장이 이미 *"…들어간 말"*이기 때문이다.
 */
function QuotedSubject({ q }: { q: string }) {
  const particle = subjectParticle(q);
  return particle ? (
    <>
      &ldquo;{q}&rdquo;
      {particle}
    </>
  ) : (
    <>&ldquo;{q}&rdquo;, 이 낱말이</>
  );
}

export default async function ArtworkListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: qRaw } = await searchParams;
  /**
   * 🔑 GET 폼 + searchParams다. 서버에서 처리하므로 **JS가 꺼져도 검색된다.**
   *   클라이언트에서 거르는 방법도 있지만, 그러면 목록을 통째로 받아야 하고
   *   작품이 늘수록 안 쓰는 데이터를 더 많이 내려받는다.
   */
  const q = (qRaw ?? "").trim();
  const searching = q !== "";

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

  const [artworks, allMadeOn, books, orderCount, wordless] = await Promise.all([
    prisma.artwork.findMany({
      where: profile
        ? {
            profileId: profile.id,
            /**
             * 🔑 아이 말만 검색 대상이다. 날짜 텍스트도, 아이 이름도 아니다.
             *   **이 서비스에서 색인을 만드는 사람은 아이여야 한다.**
             *   대상을 넓힐수록 그 근거가 흐려진다 — "3월"로 찾히면 그건 달력이 만든 색인이고,
             *   아이 이름으로 찾히면 그건 프로필이 만든 색인이다.
             *
             * 🔑 왜 full-text가 아니라 ILIKE인가 — 한국어에서 full-text가 안 먹는다.
             *   Postgres에 한국어 형태소 분석 설정이 없어서 to_tsvector('simple')은 공백으로만 자른다.
             *   실제로 확인했다:
             *     to_tsvector('simple','내가 만든 공룡을 그렸어')
             *       → '공룡을':3 '그렸어':4 '내가':1 '만든':2
             *     @@ to_tsquery('simple','공룡')  →  f   (안 걸린다)
             *     ILIKE '%공룡%'                   →  t   (걸린다)
             *   조사가 붙는 언어라서 낱말 단위 색인이 부분 문자열보다 못하다.
             *   pg_trgm은 확장 설치가 필요한데, "docker compose up 1회 기동" 요건에
             *   설치 단계를 하나 더 얹을 근거가 지금 없다.
             *
             * 🔑 인덱스를 만들지 않았다.
             *   지금 데이터는 10~60점 규모다. 이 규모에서 ILIKE는 seq scan이고 **그게 옳다** —
             *   행이 수십 개인 테이블에서 인덱스를 타는 건 오히려 느리다.
             *   근거 없이 인덱스를 만드는 것은 이 저장소가 지금까지 거절해온 종류의 결정이다.
             *   언제부터 필요해지나: 한 아이가 **수천 점**을 넘고 검색이 눈에 띄게 느려질 때.
             *   그때 필요한 건 인덱스 하나가 아니라 pg_trgm 확장 + GIN 인덱스이고,
             *   확장을 깔 근거가 그 시점에 비로소 생긴다.
             */
            ...(searching ? { childQuote: { contains: q, mode: "insensitive" as const } } : {}),
          }
        : undefined,
      orderBy: [{ madeOn: "desc" }, { createdAt: "desc" }],
      /**
       * 🔑 사진 테이블을 건드리지 않는다.
       *   사진 바이트는 <img src="/api/photo/[작품id]">가 따로 받아온다.
       *   목록 쿼리가 바이트를 끌고 오면 10점만 있어도 매 요청이 1.7MB가 된다.
       */
      select: { id: true, childQuote: true, quoteBy: true, madeOn: true },
    }),
    /**
     * 🔴 연도 집계는 **검색과 무관한 별도 조회**다. 전에는 위 목록에서 셌는데,
     *   그 목록에 검색 필터가 걸려 있어서 **검색이 책 줄을 오염시켰다.**
     *   `?q=닭`이면 책 줄이 "지금까지 1점"이라고 말하고, 그 자리에서 [책으로 묶기]를 누르면
     *   **10점짜리 책이 만들어진다.** 화면이 말한 수와 만들어진 것이 달랐다.
     *   0건 검색이면 책 줄이 통째로 사라지기까지 했다.
     *
     * 🔑 갈림길: 검색 중일 때만 이 조회를 더 할까 vs 항상 할까 → **항상.**
     *   조건부로 두면 "검색 중이 아닐 때는 위 목록에서 센다"는 두 번째 경로가 생기고,
     *   두 경로는 갈라진다 — 방금 갈라져서 이 버그가 났다.
     *   대가는 madeOn 한 열을 한 번 더 읽는 것뿐이다. 사진 바이트는 여기서도 안 읽는다.
     */
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
    // 검색으로 영원히 못 찾는 것이 몇 점인지. 화면이 그 사실을 말하기 위해 센다.
    prisma.artwork.count({
      where: profile ? { profileId: profile.id, childQuote: null } : { childQuote: null },
    }),
  ]);

  const owner = profile?.childName;
  const birth = { dueOn: profile?.dueOn ?? null, bornOn: profile?.bornOn ?? null };

  /**
   * 🔴 남긴 것이 하나도 없으면 **검색 칸을 안 그린다.**
   *   전에는 빈 화면 위에 "아이가 한 말로 찾기" 입력칸이 그대로 떠 있었다.
   *   찾을 것이 없는데 찾는 칸이 있으면, 처음 온 사람이 봐야 할 것
   *   — *"다음에 뭘 눌러야 하는지"* — 가 입력칸과 버튼 사이에서 흐려진다.
   *   빈 화면은 안내할 자리가 가장 넓은 화면이고, 그 자리를 검색에 내주지 않는다.
   */
  const nothingYet = allMadeOn.length === 0;

  /**
   * 🔑 수록작은 madeOn의 연도로 정해진다. 그래서 여기서도 그 규칙 그대로 센다.
   *   madeOn은 date 컬럼이라 UTC 자정이다 — 연도도 UTC로 읽어야 1월 1일이 옆 해로 안 샌다.
   *
   * 🔴 세는 대상이 화면에 보이는 목록이 아니라 **그 아이의 전체**다.
   *   책에 담기는 것은 검색 결과가 아니라 그 해에 남긴 전부이기 때문이다.
   */
  const byYear = new Map<number, number>();
  for (const a of allMadeOn) {
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
          {/*
            🔑 아이 이름이 링크다. 여기가 생일을 넣는 자리로 가는 유일한 입구다.
              별도 메뉴를 만들지 않은 이유: 이 값은 **한 번 넣고 다시 안 여는 값**이다.
              자주 쓰는 것과 같은 무게로 두면 화면이 그만큼 흐려진다.
          */}
          {owner ? (
            <p className="masthead__owner">
              <Link href="/child">{owner}의 기록</Link>
            </p>
          ) : null}
          <h1 className="masthead__title">아이가 남긴 것을, 그때의 말과 함께.</h1>
          <p className="masthead__lede">
            {/*
              🔴 전에는 "아이가 만든 것"이었다. 초음파 사진은 아이가 만든 것이 아니다.
                그리고 "아이의 말"도 아니다 — 그 시기에 말을 남기는 사람은 부모다.
                한 줄 정의에서 살린 것은 **버리려고 기록한다** 하나다. 그게 이 서비스의 서명이다.
            */}
            초음파 사진부터 상장까지, 한 해가 지나면 한 권으로 묶습니다.
            <strong> 그래서 실물은 마음 편히 정리하셔도 됩니다.</strong>
          </p>
        </div>

        {/* 등록은 언제나 열려 있다. 주기·마감 규칙을 만들지 않았다. */}
        <Link href="/artwork/new" className="btn">
          <Camera />
          사진 등록
        </Link>
      </header>

      {/*
        🔑 GET 폼이다. method가 기본 get이고 action이 "/"라 JS 없이 동작한다.
          🔑 태그를 안 만들고 검색을 만든 이유가 이 한 칸에 들어 있다 —
            태그는 부모가 분류를 미리 정하는 것이고, 검색은 아이가 한 말을 그대로 찾는 것이다.
            이 서비스에서 색인을 만드는 사람은 아이여야 한다.
      */}
      {nothingYet ? null : (
      <form className="search" action="/">
        <label className="search__label" htmlFor="q">
          아이가 한 말로 찾기
        </label>
        <div className="search__row">
          <input
            id="q"
            name="q"
            type="search"
            className="field__input"
            defaultValue={q}
            placeholder="공룡, 이불, 선생님…"
            aria-describedby="search-help"
          />
          {/*
            🔑 진한 버튼은 이 화면에 **하나뿐이어야 한다** — [사진 등록].
              전에는 [사진 등록]·[찾기]·[책으로 묶기] 셋이 같은 무게였고,
              처음 온 사람의 눈은 그중 무엇을 눌러야 할지 고르는 데 시간을 쓴다.
              검색은 **이미 있는 것을 좁히는 행동**이라 새로 만드는 행동과 무게가 같으면 안 된다.
              ([책으로 묶기]는 테두리로 분리된 구역 안의 주 행동이라 그대로 둔다.)
          */}
          <button type="submit" className="btn btn--ghost">
            <Search />
            찾기
          </button>
          {searching ? (
            <Link href="/" className="btn btn--ghost">
              전체 보기
            </Link>
          ) : null}
        </div>
        <p className="field__help" id="search-help">
          {/*
            🔑 못 찾는 것이 있다는 사실을 검색 옆에서 미리 말한다.
              말이 빈 작품은 검색으로 영원히 안 나온다. 그건 버그가 아니라
              "말은 지금만 받을 수 있다"의 대가가 화면에 드러나는 자리다.
              침묵하면 사용자는 그 작품이 사라졌다고 생각한다.
          */}
          그림이 아니라 <strong>아이가 한 말</strong>에서 찾습니다.
          {wordless > 0 ? ` 말이 비어 있는 ${wordless}점은 여기서 찾을 수 없습니다.` : null}
        </p>
      </form>
      )}

      {searching && artworks.length === 0 ? (
        /*
         * 🔑 0건 문구를 "아이가 그 말을 한 적이 없어요"로 쓰지 않는다.
         *   말이 빈 작품이 있는 한 그 문장은 **검산되지 않는다** —
         *   아이가 말했는데 우리가 안 받아둔 것일 수 있다.
         *   앱은 저장된 것만 안다. 아는 것까지만 말한다.
         */
        <div className="blank">
          <h2 className="blank__title">
            <QuotedSubject q={q} /> 들어간 말이 없어요.
          </h2>
          <p className="blank__body">
            저장된 아이 말 중에는 없습니다.
            {wordless > 0 ? (
              <>
                {" "}
                <strong>말이 비어 있는 {wordless}점</strong>은 검색에 걸리지 않으니,
                거기 있던 말일 수도 있습니다.
              </>
            ) : null}
          </p>
          <Link href="/" className="btn">
            전체 보기
          </Link>
        </div>
      ) : artworks.length === 0 ? (
        <EmptyList />
      ) : (
        <>
          {/*
            🔑 되짚어보기 입구를 여기 둔다. 머리말의 [사진 등록]과 경쟁시키지 않는다.
              등록은 주 사용자가 30초 안에 하는 일이고, 되짚어보기는 가끔 하는 일이다.
              빈도가 높은 것이 크고, 낮은 것은 그 목록을 설명하는 자리에 조용히 붙인다.
          */}
          <p className="tally">
            {searching ? (
              <>
                <QuotedSubject q={q} /> 들어간 말 {artworks.length}점
              </>
            ) : (
              <>
                남긴 것 {artworks.length}점 · <Link href="/recall">되짚어보기</Link>
              </>
            )}
          </p>

          {/*
            🔴 전에는 격자 하나에 전부 쏟아부었다. 시드가 한 해(10점)짜리였을 때 만든 모양이라
              구분이 필요 없었고, 네 해로 넓어질 때 **격자만 그대로 남았다.**
              그래서 `만 3세 2개월` 옆 칸이 `생후 6개월`이었고 그 사이에 아무 표시가 없었다.

            🔑 묶는 단위를 해로 고른 이유는 lib/group.ts에 적었다 — 책의 단위와 같아진다.
          */}
          {groupByYear(artworks).map(({ year, items }) => (
            <section className="span" key={year} aria-labelledby={`span-${year}`}>
              {/*
                🔑 제목이 화면 위에 붙어 있는다(sticky). 격자를 내리는 동안
                  **지금 보고 있는 것이 어느 해인지**가 화면에서 사라지지 않아야
                  구분이 구분 구실을 한다. 한 번 지나가고 마는 제목은 표지판이 아니다.
              */}
              <h2 className="span__head" id={`span-${year}`}>
                <span className="span__year">{year}년</span>
                {/*
                  🔑 그 해가 아이의 어느 시절이었는지. items가 만든 날 역순이라
                    **끝이 그 해의 처음**이다. 생일을 안 넣었으면 이 자리가 통째로 없다.
                */}
                {(() => {
                  const span = describeSpan(items[items.length - 1].madeOn, items[0].madeOn, birth);
                  return span ? <span className="span__age">{span}</span> : null;
                })()}
                {/*
                  🔑 검색 중이면 `찾은 것 n점`이다. 그냥 `n점`이라고 쓰면
                    그 해에 남긴 것이 n점이라는 말로 읽히는데, 그건 아래 책 줄이 세는 수와 다르다.
                    화면에 보이는 것만 세고, 무엇을 셌는지 같이 쓴다.
                */}
                <span className="span__count">
                  {searching ? `찾은 것 ${items.length}점` : `${items.length}점`}
                </span>
              </h2>

              <ul className="grid">
                {items.map((artwork) => (
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
                          <p className="quote">
                            <SaidBy by={artwork.quoteBy} />
                            {highlight(artwork.childQuote, q)}
                          </p>
                        ) : (
                          <p className="quote quote--empty">{emptyQuoteText(artwork.quoteBy)}</p>
                        )}
                        <p className="card__when">
                          {/*
                            🔑 날짜 앞에 시간 축을 둔다. 부모가 그 시절을 부르는 단위가 그쪽이다 —
                              "임신 24주"가 "2018년 9월 12일"보다 먼저 떠오른다.
                              생일을 안 넣었으면 축이 없고, 그때는 날짜만 남는다.
                          */}
                          {(() => {
                            const when = describeAge(artwork.madeOn, birth);
                            return when.scale === "none" ? null : (
                              <span className="card__age">{when.label}</span>
                            );
                          })()}
                          <time className="card__date" dateTime={artwork.madeOn.toISOString()}>
                            {formatMadeOn(artwork.madeOn)}
                          </time>
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
      <h2 className="blank__title">아직 남긴 것이 없어요.</h2>
      <p className="blank__body">
        아이가 그림을 내밀면, 병원에서 초음파 사진을 받아 나오면 — <strong>그 자리에서</strong>
        사진을 찍고 <strong>그때의 말</strong>을 그대로 적어두세요.
        그 말은 그 자리에서 안 받으면 영영 얻을 수 없습니다.
      </p>
      <Link href="/artwork/new" className="btn">
        <Camera />
        첫 한 점 남기기
      </Link>
    </div>
  );
}
