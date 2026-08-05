import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { describeAge, timeBand } from "@/lib/age";
import { letterTiming } from "@/lib/letter";
import { ArrowLeft } from "../../icons";

/**
 * 되짚어보기 — 한 장 보기.
 *
 * 🔑 사진과 만든 날만 먼저 나오고, 아이 말은 접혀 있다.
 *   설명으로 "말이 없으면 뭘 잃는지"를 말할 수도 있었다. 그건 안 믿긴다.
 *   대신 **겪게 한다** — 그림만 보고 있으면 무엇을 그린 건지 모른다.
 *   펴야 알게 되고, 펴는 순간 그 말이 없었으면 못 알았다는 걸 스스로 안다.
 *
 * 🔑 상세 화면(/artwork/[id])에서는 절대 접지 않는다.
 *   거기는 **보관하는 자리**라 말이 항상 보여야 한다.
 *   여기만 접는다. 목적이 다르기 때문이다 — 여기는 겪는 자리다.
 *
 * 🔑 <details>라 JS가 0줄이다.
 *   브라우저가 여닫으므로 로딩·실패 상태를 새로 만들 필요가 없다.
 *   이 경로 전체에 클라이언트 컴포넌트가 하나도 없다.
 */
export const dynamic = "force-dynamic";

export default async function RecallOnePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prisma = getPrisma();

  const artwork = await prisma.artwork.findUnique({
    where: { id },
    select: {
      id: true,
      profileId: true,
      madeOn: true,
      createdAt: true,
      letters: {
        orderBy: [{ writtenOn: "asc" }, { createdAt: "asc" }],
        select: { id: true, body: true, writtenBy: true, writtenOn: true },
      },
      photo: { select: { width: true, height: true } },
      profile: { select: { dueOn: true, bornOn: true } },
    },
  });

  if (!artwork) notFound();

  // 입구와 같은 축(1월부터)으로 다음 한 점을 찾는다.
  const next = await prisma.artwork.findFirst({
    where: {
      profileId: artwork.profileId,
      OR: [
        { madeOn: { gt: artwork.madeOn } },
        { madeOn: artwork.madeOn, createdAt: { gt: artwork.createdAt } },
      ],
    },
    orderBy: [{ madeOn: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const { width, height } = artwork.photo ?? {};
  const when = describeAge(artwork.madeOn, artwork.profile);
  // 여닫는 문구는 첫 통(그때의 말)의 주인을 따른다. 통이 여럿이면 펴봐야 다 나온다.
  const child = artwork.letters[0]?.writtenBy === "CHILD";

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href="/recall" className="btn btn--ghost">
          <ArrowLeft />
          되짚어보기
        </Link>
      </nav>

      <figure className="detail__figure">
        <img
          className="detail__img"
          src={`/api/photo/${artwork.id}`}
          alt=""
          width={width ?? undefined}
          height={height ?? undefined}
          decoding="async"
        />
      </figure>

      <p className="recallone__date">
        {timeBand(when.scale) === null ? null : (
          <>
            <span className={`age--${timeBand(when.scale)}`}>{when.label}</span> ·{" "}
          </>
        )}
        <time dateTime={artwork.madeOn.toISOString()}>{formatMadeOn(artwork.madeOn)}</time>
      </p>

      {artwork.letters.length > 0 ? (
        <details className="recallone__said">
          <summary className="recallone__toggle">
            그때 뭐라고 {child ? "했는지" : "적었는지"} 보기
          </summary>
          {artwork.letters.map((letter) => {
            const timing = letterTiming(artwork.madeOn, letter.writtenOn);
            return (
              <blockquote className="recallone__quote" key={letter.id}>
                {timing ? <span className="letter__timing">{timing} 쓴 편지</span> : null}
                {letter.body}
              </blockquote>
            );
          })}
        </details>
      ) : (
        /*
         * 🔑 말이 없는 점. 이 화면에서 가장 중요한 상태다.
         *   펼 것이 없다. 그림과 날짜만 남는다 — 그게 "말을 못 받았을 때 남는 것"의 전부다.
         *   설명하지 않아도 옆의 다른 점들과 비교되면서 저절로 읽힌다.
         */
        <p className="recallone__none">여기엔 말이 남아 있지 않습니다.</p>
      )}

      <div className="form__actions">
        {next ? (
          <Link href={`/recall/${next.id}`} className="btn">
            다음
          </Link>
        ) : (
          <Link href="/recall/done" className="btn">
            다음
          </Link>
        )}
        <Link href={`/artwork/${artwork.id}`} className="btn btn--ghost">
          이 한 장 보기
        </Link>
      </div>
    </div>
  );
}
