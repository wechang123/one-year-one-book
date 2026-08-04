import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn, toDateInputValue } from "@/lib/date";
import { InlineQuoteForm } from "./inline-quote";

/**
 * 작품 상세.
 *
 * 🔑 이 화면이 존재하는 이유는 "자세히 보기"가 아니다.
 *   이 서비스는 부모에게 **실물을 버려도 된다고 말하려고** 만들었다.
 *   그 말이 성립하려면 화면 속 한 장이 서랍 속 원본을 대신할 만큼 보여야 한다.
 *   그래서 이 화면의 예산 대부분을 사진 하나에 쓴다.
 *
 * 🔑 목록과 다르게 아이 말을 자르지 않는다.
 *   목록의 .quote는 세 줄에서 끊는다(카드 높이를 고르게 하려고).
 *   여기서 또 자르면 잘린 문장을 볼 곳이 어디에도 없어진다.
 */

// 편집한 결과가 바로 보여야 한다. 목록과 같은 이유다.
export const dynamic = "force-dynamic";

export default async function ArtworkDetailPage({
  params,
  searchParams,
}: {
  // Next 15부터 동적 세그먼트는 Promise로 온다. await 없이 쓰면 조용히 undefined가 된다.
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const prisma = getPrisma();

  const artwork = await prisma.artwork.findUnique({
    where: { id },
    /**
     * 사진 바이트는 여기서도 안 읽는다. <img src="/api/photo/[id]">가 따로 받는다.
     * 대신 width·height만 가져온다 — 사진이 도착하기 전에 자리를 잡아두면
     * 아래 글이 밀려 내려가지 않는다. 세로로 긴 그림에서 특히 크게 튄다.
     */
    select: {
      id: true,
      profileId: true,
      childQuote: true,
      madeOn: true,
      // 같은 날 여러 점일 때 순서를 가르는 값. 홈 격자와 같은 축을 쓴다.
      createdAt: true,
      photo: { select: { width: true, height: true } },
    },
  });

  /**
   * 없는 id면 404로 넘긴다. app/not-found.tsx가 받는다.
   * 여기서 "없는 작품입니다" 화면을 따로 만들지 않는 이유:
   * 주소를 잘못 친 것과 지워진 작품을 사용자는 구분할 수 없고, 할 일도 같다 — 목록으로 돌아가는 것.
   */
  if (!artwork) notFound();

  /**
   * 등록 직후에만 조회한다.
   *
   * 🔑 왜 이 자리인가
   *   이 서비스는 알림을 만들지 않는다. 트리거가 앱 밖에 있기 때문이다 —
   *   아이가 그림을 들고 오는 것이 트리거고, 앱이 주기를 만들면 그 설계가 무너진다.
   *   그러면 **보장된 방문이 등록 직후 하나뿐**이다. 모든 방문에 소비를 붙일 자리가 여기다.
   *
   * 🔑 규칙은 한 문장이다 — **"이 작품보다 앞에 만든 것 중, 말이 남아 있는 가장 최근 것."**
   *   무작위로 뽑으면 예쁜 위젯은 되지만 설명할 수 없다.
   *   말이 없는 점을 건너뛰는 이유: 이 블록의 일이 **말을 돌려주는 것**이라
   *   돌려줄 게 없는 점을 가리키면 "지난번엔 안 물어보셨네요"로 읽힌다. 그건 질책이다.
   *
   * 🔑 사진을 안 읽는다. 바이트도, width/height도 아니다.
   *   바로 위에서 "이제 원본은 정리하셔도 됩니다"라고 해놓고 옛 그림을 눈앞에 놓으면
   *   그 문구를 배신한다. **말만 얹으면 그 문구의 증거가 된다.**
   *   쿼리도 @@index([profileId, madeOn])을 그대로 탄다.
   */
  const lastWords =
    saved === undefined
      ? null
      : await prisma.artwork.findFirst({
          where: {
            profileId: artwork.profileId,
            childQuote: { not: null },
            OR: [
              { madeOn: { lt: artwork.madeOn } },
              { madeOn: artwork.madeOn, createdAt: { lt: artwork.createdAt } },
            ],
          },
          orderBy: [{ madeOn: "desc" }, { createdAt: "desc" }],
          select: { id: true, childQuote: true, madeOn: true },
        });

  const { width, height } = artwork.photo ?? {};

  return (
    <div className="page">
      <nav className="detail__nav">
        <Link href="/" className="btn btn--ghost">
          ← 작품 목록
        </Link>
      </nav>

      {/*
        🔑 등록 직후 문구가 "저장되었습니다"가 아니다.
          부모는 보관하려고 이 서비스를 여는 게 아니라, **버려도 된다는 허락**을 받으려고 연다.
          "저장되었습니다"는 앱이 한 일을 보고할 뿐이고, 사용자가 다음에 할 일 —
          거실에 쌓인 그림을 정리하는 것 — 에 대해서는 아무 말도 하지 않는다.

          그리고 이 문구를 목록이 아니라 여기서 말한다. 사진이 크게 보이는 자리에서
          해야 믿긴다. 작은 카드 옆에서 "정리하셔도 됩니다"는 설득력이 없다.
      */}
      {/*
        🔑 허락을 조건화하지 않는다.
          말이 있든 없든 첫 문장이 같고 **무게도 같다.**
          "말을 채워야 정리하셔도 됩니다"로 쓰면 04-content §2-1
          ("말 없는 사진은 나중에 채울 수 있다")을 즉시 거짓으로 만든다.

          더 큰 문제는 따로 있다 — 이 앱이 사용자에게 주기로 한 유일한 것이 **허락**인데,
          그걸 성실도에 따라 배급하는 순간 그 허락이 조건부가 된다.
          그러면 말을 못 받은 날 부모는 허락도 못 받는다. 가장 필요한 날에 못 받는 것이다.
      */}
      {saved !== undefined ? (
        <p className="saved" role="status">
          <strong>남았습니다. 이제 원본은 정리하셔도 됩니다.</strong>
          {artwork.childQuote ? (
            <span className="saved__sub">아이 말과 만든 날까지 같이 저장했습니다.</span>
          ) : (
            <span className="saved__sub">
              그림은 사진으로 남았습니다. 말은 지금만 받을 수 있어서 자리를 비워뒀습니다.
            </span>
          )}
        </p>
      ) : null}

      {/* 말이 비어 있을 때만. 아이가 아직 옆에 있는 유일한 순간이다. */}
      {saved !== undefined && !artwork.childQuote ? (
        <InlineQuoteForm id={artwork.id} madeOn={toDateInputValue(artwork.madeOn)} />
      ) : null}

      {/*
        🔑 등록 직후에만 나오는 자리. 사진은 없다 — 위 문구를 배신하지 않기 위해서다.
      */}
      {saved !== undefined ? (
        lastWords ? (
          <Link href={`/artwork/${lastWords.id}`} className="recall">
            <span className="recall__label">지난번엔 이렇게 말했어요</span>
            <span className="recall__quote">{lastWords.childQuote}</span>
            <time className="recall__date" dateTime={lastWords.madeOn.toISOString()}>
              {formatMadeOn(lastWords.madeOn)}
            </time>
          </Link>
        ) : (
          /*
           * 🔑 첫 등록. 여기가 이 블록의 진짜 설계다.
           *   "다음에 등록하면 여기에 지난 말이 옵니다"라고 쓸 수도 있었다.
           *   그건 **줄 게 없는 앱이 하는 약속**이고, 알림을 만들지 않기로 한 서비스가
           *   같은 일을 문장으로 하는 것이다.
           *   대신 지금 줄 수 있는 것을 준다 — 방금 한 일이 무엇이었는지.
           */
          <p className="recall recall--first">
            <span className="recall__label">이게 첫 점입니다</span>
            <span className="recall__quote">
              그림은 사진으로 남고, <strong>그때 한 말은 지금만 받을 수 있습니다.</strong>
            </span>
            <span className="recall__date">이 서비스가 남기는 건 그 두 가지입니다</span>
          </p>
        )
      ) : null}

      <article className="detail">
        <figure className="detail__figure">
          <img
            className="detail__img"
            src={`/api/photo/${artwork.id}`}
            /*
             * 목록과 같은 이유로 alt를 비운다 — 아이 말은 그림의 설명이 아니라
             * 그림을 보고 한 말이고, 바로 아래에 글로 나와 있다.
             * 여기 넣으면 스크린리더가 같은 문장을 두 번 읽는다.
             */
            alt=""
            /*
             * DB에 원본 크기가 있으면 그대로 넘긴다. 브라우저가 이 비율로 자리를 먼저 잡는다.
             * 업로드 경로에서는 아직 못 채우므로 없을 수 있고, 없으면 안 넘긴다
             * (0이나 임의값을 넣으면 오히려 틀린 비율로 자리를 잡는다).
             */
            width={width ?? undefined}
            height={height ?? undefined}
            /* 이 화면의 주인공이다. 목록과 달리 지연 로딩하지 않는다. */
            decoding="async"
          />
        </figure>

        <div className="detail__side">
          {artwork.childQuote ? (
            <blockquote className="detail__quote">{artwork.childQuote}</blockquote>
          ) : (
            /*
             * 비어 있는 것을 숨기지 않는다. 이 서비스에서 아이 말이 비어 있다는 건
             * 결함이 아니라 "아직 안 물어봤다"는 상태이고, 지금도 채울 수 있다.
             */
            <p className="detail__quote detail__quote--empty">
              아직 안 물어봤어요.
              <br />
              <span className="detail__hint">
                지금 <strong>&ldquo;이거 무슨 얘기야?&rdquo;</strong>라고 물어봐도 늦지 않습니다.
                그때 한 말은 그때만 얻을 수 있지만, 기억나는 말은 지금 적어둘 수 있어요.
              </span>
            </p>
          )}

          <dl className="detail__meta">
            <dt>만든 날</dt>
            <dd>
              <time dateTime={artwork.madeOn.toISOString()}>{formatMadeOn(artwork.madeOn)}</time>
            </dd>
          </dl>

          {/*
            🔑 아이 말이 비어 있을 때 문구가 다르다.
              비어 있으면 할 일은 "고치기"가 아니라 "지금 물어보고 채우기"다.
              같은 버튼이라도 무엇을 하러 가는지가 다르면 그렇게 말해야 한다.
          */}
          <div className="detail__actions">
            <Link href={`/artwork/${artwork.id}/edit`} className="btn btn--ghost">
              {artwork.childQuote ? "설명 고치기" : "아이 말 채우기"}
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
