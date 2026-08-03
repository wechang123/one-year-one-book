import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";

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
}: {
  // Next 15부터 동적 세그먼트는 Promise로 온다. await 없이 쓰면 조용히 undefined가 된다.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      childQuote: true,
      madeOn: true,
      photo: { select: { width: true, height: true } },
    },
  });

  /**
   * 없는 id면 404로 넘긴다. app/not-found.tsx가 받는다.
   * 여기서 "없는 작품입니다" 화면을 따로 만들지 않는 이유:
   * 주소를 잘못 친 것과 지워진 작품을 사용자는 구분할 수 없고, 할 일도 같다 — 목록으로 돌아가는 것.
   */
  if (!artwork) notFound();

  const { width, height } = artwork.photo ?? {};

  return (
    <div className="page">
      <nav className="detail__nav">
        <Link href="/" className="btn btn--ghost">
          ← 작품 목록
        </Link>
      </nav>

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
                지금 물어봐도 늦지 않습니다. 그때 한 말은 그때만 얻을 수 있지만,
                기억나는 말은 지금 적어둘 수 있어요.
              </span>
            </p>
          )}

          <dl className="detail__meta">
            <dt>만든 날</dt>
            <dd>
              <time dateTime={artwork.madeOn.toISOString()}>{formatMadeOn(artwork.madeOn)}</time>
            </dd>
          </dl>
        </div>
      </article>
    </div>
  );
}
