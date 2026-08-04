import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { describeAge } from "@/lib/age";
import { SaidBy, emptyQuoteText } from "../artwork/said-by";
import { ArrowLeft } from "../icons";

/**
 * 되짚어보기 — 입구.
 *
 * 🔑 사진이 한 장도 없다. 그게 이 화면의 전부다.
 *   이 서비스는 부모에게 "실물을 버려도 된다"고 말한다.
 *   그 말이 사실인지 확인할 수 있는 화면이 지금까지 없었다 —
 *   목록도 상세도 사진이 주인공이라, **버리고 나면 무엇이 남는지**를 보여주지 않았다.
 *
 *   여기서 사진을 빼면 남는 것이 그대로 보인다. **아이의 말이 세로로 쌓인 벽.**
 *   그게 이 서비스가 실제로 남기는 것이고, 부모가 버릴 결심을 하는 근거다.
 *
 * 🔑 걷는 축이 1월부터다. 홈과 반대다.
 *   홈은 최신순이다 — 방금 등록한 것을 확인하러 오기 때문이다.
 *   여기는 한 해를 **처음부터 겪는** 자리라 책과 같은 축을 쓴다.
 *   확인하러 오는 곳은 최신순, 읽는 곳은 1월부터.
 */
export const dynamic = "force-dynamic";

export default async function RecallPage() {
  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });

  const artworks = await prisma.artwork.findMany({
    where: profile ? { profileId: profile.id } : undefined,
    orderBy: [{ madeOn: "asc" }, { createdAt: "asc" }],
    // 사진 테이블을 아예 건드리지 않는다. 이 화면에는 사진이 없다.
    select: { id: true, childQuote: true, quoteBy: true, madeOn: true },
  });

  const first = artworks[0];
  const birth = { dueOn: profile?.dueOn ?? null, bornOn: profile?.bornOn ?? null };

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href="/" className="btn btn--ghost">
          <ArrowLeft />
          목록으로
        </Link>
      </nav>

      <header className="form__head">
        <h1 className="form__title">되짚어보기</h1>
        <p className="form__lede">
          실물을 정리하고 나면 남는 것입니다. <strong>사진은 한 장도 없습니다.</strong>
        </p>
      </header>

      {artworks.length === 0 ? (
        <div className="blank">
          <h2 className="blank__title">아직 되짚어볼 것이 없어요.</h2>
          <p className="blank__body">
            한 점 남기면서 <strong>그때의 말</strong>을 적어두면 여기에 쌓입니다.
          </p>
          <Link href="/artwork/new" className="btn">
            첫 한 점 남기기
          </Link>
        </div>
      ) : (
        <>
          <ol className="saidlist">
            {artworks.map((a) => (
              <li key={a.id} className="saidlist__item">
                <Link href={`/recall/${a.id}`} className="saidlist__link">
                  {a.childQuote ? (
                    <span className="saidlist__quote">
                      <SaidBy by={a.quoteBy} />
                      {a.childQuote}
                    </span>
                  ) : (
                    /*
                     * 🔑 말이 빈 것도 남긴다. 빼지 않는다.
                     *   "비어 있다는 사실은 숨기지 않는다"가 이 서비스의 원칙이고(04-content §2-1),
                     *   무엇보다 이 화면의 주제가 **"버리면 무엇이 남나"**다.
                     *   빈 줄은 **남지 않은 것**을 보여준다. 그게 빠지면 이 화면은
                     *   "다 잘 남았다"는 거짓말이 된다.
                     */
                    <span className="saidlist__quote saidlist__quote--empty">
                      {emptyQuoteText(a.quoteBy)}
                    </span>
                  )}
                  <time className="saidlist__date" dateTime={a.madeOn.toISOString()}>
                    {(() => {
                      const when = describeAge(a.madeOn, birth);
                      return when.scale === "none" ? null : <>{when.label} · </>;
                    })()}
                    {formatMadeOn(a.madeOn)}
                  </time>
                </Link>
              </li>
            ))}
          </ol>

          {first ? (
            <div className="form__actions">
              <Link href={`/recall/${first.id}`} className="btn">
                한 장씩 보기
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
