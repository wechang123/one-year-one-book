import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { subjectParticle } from "@/lib/korean";
import { couldHaveSpoken, describeAge, describeSpan, timeBand } from "@/lib/age";
import { groupByYear } from "@/lib/group";
import { SaidBy, emptyQuoteText } from "../artwork/said-by";
import { Camera, Search } from "../icons";

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

export default async function GridPage({
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

  const [artworks, allMadeOn, wordless] = await Promise.all([
    prisma.artwork.findMany({
      where: profile
        ? {
            profileId: profile.id,
            /**
             * 🔑 편지만 검색 대상이다. 날짜 텍스트도, 아이 이름도 아니다.
             *   **이 서비스에서 색인을 만드는 사람은 말을 남긴 사람이어야 한다.**
             *   대상을 넓힐수록 그 근거가 흐려진다 — "3월"로 찾히면 그건 달력이 만든 색인이고,
             *   아이 이름으로 찾히면 그건 프로필이 만든 색인이다.
             *
             * 🔑 걸러지는 단위는 **작품(점)**이다. `letters: { some }`이라
             *   편지 여러 통이 걸려도 작품은 한 번만 나온다 — 격자의 칸이 실물이라
             *   같은 실물이 두 칸으로 불어나면 "N점"이 거짓이 된다.
             *   몇 통이 걸렸는지는 아래 결과 줄이 통 단위로 따로 센다.
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
             * 🔑 인덱스를 만들지 않았다. 지금 규모(수십 통)에서 ILIKE는 seq scan이고 그게 옳다.
             *   수천 통을 넘어 느려질 때 pg_trgm + GIN을 깔 근거가 비로소 생긴다.
             */
            ...(searching
              ? { letters: { some: { body: { contains: q, mode: "insensitive" as const } } } }
              : {}),
          }
        : undefined,
      orderBy: [{ madeOn: "desc" }, { createdAt: "desc" }],
      /**
       * 🔑 사진 테이블을 건드리지 않는다.
       *   사진 바이트는 <img src="/api/photo/[작품id]">가 따로 받아온다.
       *   목록 쿼리가 바이트를 끌고 오면 10점만 있어도 매 요청이 1.7MB가 된다.
       *
       * 🔑 검색 중에는 **걸린 편지만** 싣는다. 카드가 보여줄 것이 "왜 찾혔는가"라서다.
       *   평소에는 전부 싣고 카드가 첫 통(그때의 말)을 대표로 보여준다(lib/letter.ts).
       */
      select: {
        id: true,
        madeOn: true,
        letters: {
          orderBy: [{ writtenOn: "asc" as const }, { createdAt: "asc" as const }],
          select: { id: true, body: true, writtenBy: true },
          ...(searching
            ? { where: { body: { contains: q, mode: "insensitive" as const } } }
            : {}),
        },
      },
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
    // 검색으로 영원히 못 찾는 것이 몇 점인지. 화면이 그 사실을 말하기 위해 센다.
    prisma.artwork.count({
      where: profile
        ? { profileId: profile.id, letters: { none: {} } }
        : { letters: { none: {} } },
    }),
  ]);

  /**
   * 🔑 걸린 편지 수. 작품 수와 단위가 다르다 — 한 점에 두 통이 걸릴 수 있다.
   *   "N점"만 말하면 통이 몇인지 아무도 안 세고, "N통"만 말하면 격자의 칸 수와 어긋난다.
   *   둘 다 세고 둘 다 말한다. 단위가 흐려지는 것보다 숫자 두 개가 낫다.
   */
  const matchedLetters = searching ? artworks.reduce((n, a) => n + a.letters.length, 0) : 0;

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
   * 🔑 이 아카이브가 어디까지 거슬러 올라가는가. 머리말 요약에 쓴다.
   *   8~9년을 쌓는 서비스에서 **가장 먼저 남긴 것이 언제인지**가 규모를 말하는 수치다.
   *   `allMadeOn`을 한 번 훑을 뿐 조회를 늘리지 않는다.
   */
  const firstYear = nothingYet
    ? null
    : Math.min(...allMadeOn.map((a) => a.madeOn.getUTCFullYear()));



  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__text">
          {/*
            🔴 두 줄이었다. `하늘의 기록`이 왼쪽에, `남긴 것 12점 · 2018년부터`가 오른쪽에
              따로 있었고 **둘 다 작은 회색 메타 줄**이었다. 같은 성격의 것이 좌우로 갈려서
              머리말이 2단처럼 읽혔다. 한 줄로 합쳤다.

            🔑 아이 이름이 링크다. 여기가 생일을 넣는 자리로 가는 유일한 입구다.
              별도 메뉴를 만들지 않은 이유: 이 값은 **한 번 넣고 다시 안 여는 값**이다.
              자주 쓰는 것과 같은 무게로 두면 화면이 그만큼 흐려진다.
          */}
          {/*
            🔴 `하늘의 기록 · 남긴 것 12점 · 2018년부터`로 가운뎃점이 **둘**이었다.
              한 줄에 구분자가 둘이면 어느 쪽이 더 큰 나눔인지 화면이 말하지 못한다.
              `남긴 것`을 빼고 어순을 바꿔 하나로 줄였다 — `하늘의 기록 · 2018년부터 12점`.
              센 것이 무엇인지는 바로 아래 해 제목들이 이어서 말한다.
          */}
          {owner || !nothingYet ? (
            <p className="masthead__meta">
              {owner ? <Link href="/child">{owner}의 기록</Link> : null}
              {owner && !nothingYet ? " · " : null}
              {nothingYet ? null : (
                <>
                  {firstYear}년부터 <strong>{allMadeOn.length}점</strong>
                </>
              )}
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

        {/*
          🔑 오른쪽에는 이제 버튼 하나뿐이다. 요약을 왼쪽 메타 줄로 옮기면서
            감싸던 `div`가 할 일이 없어져서 걷어냈다 — 아이 하나짜리 상자는 상자가 아니다.

          등록은 언제나 열려 있다. 주기·마감 규칙을 만들지 않았다.
        */}
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
      /*
        🔴 한 번 `<details>`로 접었다가 폈다. 접은 근거가 세로 168px이었는데,
          **그 168px을 안 쪼개봤다.** 쪼개보니 이렇다(375px):

            이름표 줄 42 + 입력칸 줄 50 + 도움말 줄 42 + 여백 24  =  168
            접었을 때                                            =   66
            입력칸 줄만 남겼을 때                                  =   74

          **차이가 8px이다.** 아낀 102px 중 94px은 이름표와 도움말이 만든 것이고,
          토글이 실제로 산 것은 8px이었다. **8px을 벌자고 기능 하나를 클릭 뒤에 숨긴 셈이다.**
          부 사용자는 노트북 1440px에서 5분인데, 세로가 남아도는 화면에서도 같이 접혀 있었다.

        🔑 그래서 줄 두 개를 없앤다 — 이름표는 자리표시자로 내리고,
          도움말은 **검색 중일 때만** 띄운다. 못 찾는 것이 있다는 안내는 그때 필요하고,
          0건 화면(`.blank`)이 이미 같은 말을 한다.
      */
      <form className="search" action="/grid">
        <div className="search__row">
          <input
            id="q"
            name="q"
            type="search"
            className="field__input"
            defaultValue={q}
            /*
              🔑 자리표시자가 이름표 노릇을 한다. 예시(`공룡, 이불…`)를 뺀 것은
                375px에서 입력칸이 224px이라 둘 다 넣으면 잘리기 때문이다.
                무엇을 넣는 칸인지가 예시보다 앞선다.
            */
            placeholder="남긴 말로 찾기"
            aria-label="남긴 말로 찾기"
            aria-describedby={searching ? "search-help" : undefined}
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
            <Link href="/grid" className="btn btn--ghost">
              전체 보기
            </Link>
          ) : null}
        </div>
        {/*
          🔴 전에는 이 도움말이 **항상** 떠 있었고, 375px에서 두 줄로 감겨 42px을 먹었다.
            지금은 검색 중일 때만 나온다.

          🔑 못 찾는 것이 있다는 사실은 **찾고 나서** 필요하다. 아직 안 찾은 사람에게
            "이건 못 찾습니다"를 먼저 말하면, 아직 하지도 않은 일의 한계를 먼저 읽는 셈이다.
            말이 빈 작품은 검색으로 영원히 안 나온다 — 그건 버그가 아니라
            "말은 지금만 받을 수 있다"의 대가이고, 침묵하면 사용자는 그 작품이 사라졌다고 본다.
            0건 화면(`.blank`)도 같은 말을 한다. 두 자리 다 살아 있다.
        */}
        {searching ? (
          <>
            <p className="field__help" id="search-help">
              그림이 아니라 <strong>남긴 말</strong>에서 찾습니다.
              {wordless > 0 ? ` 말이 비어 있는 ${wordless}점은 여기서 찾을 수 없습니다.` : null}
            </p>
            {/*
              🔑 찾은 총량은 여기다. 해 제목은 그 해 안에서 몇 점인지만 말하므로
                여러 해에 걸쳐 찾혔을 때 전부 몇 점인지는 아무도 말하지 않는다.
            */}
            {artworks.length > 0 ? (
              <p className="search__result">
                <QuotedSubject q={q} /> 들어간 편지 <strong>{matchedLetters}통</strong>
                {/* 통과 점이 다를 때만 점을 덧붙인다. 같으면 같은 수를 두 번 말하는 것이다. */}
                {matchedLetters !== artworks.length ? <> · {artworks.length}점에서</> : null}
              </p>
            ) : null}
          </>
        ) : null}
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
            저장된 말 중에는 없습니다.
            {wordless > 0 ? (
              <>
                {" "}
                <strong>말이 비어 있는 {wordless}점</strong>은 검색에 걸리지 않으니,
                거기 있던 말일 수도 있습니다.
              </>
            ) : null}
          </p>
          <Link href="/grid" className="btn">
            전체 보기
          </Link>
        </div>
      ) : artworks.length === 0 ? (
        <EmptyList />
      ) : (
        <>
          {/*
            🔴 여기 `남긴 것 12점 · 되짚어보기` 한 줄이 있었다. 지웠다.
              세 조각이 전부 다른 곳으로 갔기 때문이다 —
              **점수**는 머리말 요약이, **해별 점수**는 해 제목이, **되짚어보기**는 상단 바가 맡는다.
              한 줄 안에 남은 것이 없는데 줄만 남아 있었다.
          */}

          {/*
            🔴 전에는 격자 하나에 전부 쏟아부었다. 시드가 한 해(10점)짜리였을 때 만든 모양이라
              구분이 필요 없었고, 네 해로 넓어질 때 **격자만 그대로 남았다.**
              그래서 `만 3세 2개월` 옆 칸이 `생후 6개월`이었고 그 사이에 아무 표시가 없었다.

            🔑 묶는 단위를 해로 고른 이유는 lib/group.ts에 적었다 — 책의 단위와 같아진다.
          */}
          {groupByYear(artworks).map(({ year, items }) => (
            <section
              className={
                /*
                  🔑 제목 밑줄이 **그 아래 카드들의 시기**를 띤다.
                    격자가 최신순이라 제목 바로 밑에 오는 것이 그 해의 마지막 시기이고,
                    `items[0]`이 바로 그것이다. 선이 자기 밑에 있는 것과 같은 색이 된다.
                */
                (() => {
                  const b = timeBand(describeAge(items[0].madeOn, birth).scale);
                  return b ? `span span--${b}` : "span";
                })()
              }
              key={year}
              aria-labelledby={`span-${year}`}
            >
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
                  if (!span) return null;
                  /*
                    🔑 양 끝을 각자 자기 시기 색으로 칠한다.
                      `임신 32주 5일 ~ 생후 6개월`이 보라에서 청록으로 넘어가면서,
                      **그 해에 아이가 태어났다는 사실**이 제목 한 줄에 그대로 보인다.
                  */
                  return (
                    <span className="span__age">
                      <span className={`age--${span.from.band}`}>{span.from.label}</span>
                      {span.to ? (
                        <>
                          {" ~ "}
                          <span className={`age--${span.to.band}`}>{span.to.label}</span>
                        </>
                      ) : null}
                    </span>
                  );
                })()}
                {/*
                  🔴 평소에도 `· 6점`이 붙어 있었다. 뺐다.
                    ① 한 줄에 가운뎃점이 둘이 됐고, ② 바로 아래 책 줄이 같은 해를
                    `진행 중 · 지금까지 6점`으로 이미 센다. **같은 수를 두 번 말하고 있었다.**

                  🔑 검색 중에는 다르다. 화면에 보이는 것이 그 해 전부가 아니라서
                    몇 점이 걸린 것인지 여기가 아니면 아무도 말하지 않는다.
                    구분자를 또 쓰지 않으려고 괄호로 붙인다.
                */}
                {searching ? (
                  <span className="span__count">(찾은 것 {items.length}점)</span>
                ) : null}
              </h2>

              <ul className="grid">
                {items.map((artwork) => {
                  /*
                    🔑 시기를 카드 전체가 안다. 라벨 색과 사진 틀 바탕이 같은 값에서 나와야
                      둘이 어긋나지 않는다 — 한 곳에서 정하고 두 곳이 쓴다.
                  */
                  const when = describeAge(artwork.madeOn, birth);
                  const band = timeBand(when.scale);
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
                        {artwork.letters.length > 0 ? (
                          /*
                            🔑 카드는 한 통만 싣는 자리다 — 평소에는 첫 통(그때의 말).
                              검색 중에는 걸린 편지들이다(쿼리가 걸린 것만 실어 보낸다).
                              나머지가 몇 통인지는 꼬리가 센다. 칸 높이를 지키면서
                              "더 있다"는 사실은 숨기지 않는 최소한이다.
                          */
                          <>
                            {(searching ? artwork.letters : artwork.letters.slice(0, 1)).map(
                              (letter) => (
                                <p className="quote" key={letter.id}>
                                  <SaidBy by={letter.writtenBy} />
                                  {highlight(letter.body, q)}
                                </p>
                              ),
                            )}
                            {!searching && artwork.letters.length > 1 ? (
                              <p className="card__more">편지 {artwork.letters.length}통</p>
                            ) : null}
                          </>
                        ) : (
                          /* 빈 문구는 시기에서 나온다 — 저장된 주인이 더는 없다. (app/page.tsx) */
                          <p className="quote quote--empty">
                            {emptyQuoteText(couldHaveSpoken(artwork.madeOn, birth) ? "CHILD" : "PARENT")}
                          </p>
                        )}
                        <p className="card__when">
                          {/*
                            🔑 날짜 앞에 시간 축을 둔다. 부모가 그 시절을 부르는 단위가 그쪽이다 —
                              "임신 24주"가 "2018년 9월 12일"보다 먼저 떠오른다.
                              생일을 안 넣었으면 축이 없고, 그때는 날짜만 남는다.
                          */}
                          {band === null ? null : (
                            <span className={`card__age age--${band}`}>{when.label}</span>
                          )}
                          <time className="card__date" dateTime={artwork.madeOn.toISOString()}>
                            {formatMadeOn(artwork.madeOn)}
                          </time>
                        </p>
                      </div>
                    </Link>
                  </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}

      {/*
        🔴 여기 책 줄(`BooksStrip`)이 있었다. 지웠다.
          v1에서 이 자리에 둔 근거는 *"책 만들기 → 주문 → 상태 변경으로 가는 동선이 끊기면
          안 된다"*였다. v2에는 **사이드바에 `책` 칸이 있어서** 그 동선이 끊기지 않는다.
          같은 줄을 두 화면에서 그리면, 한쪽에서 만든 책이 다른 쪽에 안 보일 때
          어느 쪽이 진짜인지 물어야 한다. 그릴 곳은 하나면 된다.
      */}

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
        아이가 그림을 내밀면, 병원에서 초음파 사진을 받아 나오면, <strong>그 자리에서</strong>
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
