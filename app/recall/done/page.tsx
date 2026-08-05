import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { ArrowLeft } from "../../icons";

/**
 * 되짚어보기 — 끝.
 *
 * 🔑 "다 보셨습니다"라고 쓸 수도 있었다. 그건 진행률을 보고하는 문장이다.
 *   여기는 **이 서비스의 목적이 화면에서 닫히는 유일한 순간**이다.
 *
 *   등록 직후의 허락은 **방금 그 한 점**에 대한 것이다.
 *   여기서 주는 허락은 **전부**에 대한 것이다 — 한 해를 처음부터 끝까지 걷고 나서,
 *   남는 것이 무엇인지 직접 보고 나서 받는 허락이다.
 *   그 둘은 무게가 다르고, 그래서 이 화면이 따로 있다.
 *
 * 🔑 이 경로에 책·주문 링크를 두지 않는다.
 *   여기까지 온 사람에게 "이제 책으로 만드세요"를 붙이면
 *   방금 준 허락이 **판매로 가는 통로**가 된다. 허락은 허락으로 끝나야 한다.
 *   책은 홈에 있고, 필요하면 스스로 간다.
 */
export const dynamic = "force-dynamic";

export default async function RecallDonePage() {
  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });

  // 사진도 말도 읽지 않는다. 세는 것만 한다.
  const [total, withQuote] = await Promise.all([
    prisma.artwork.count({ where: profile ? { profileId: profile.id } : undefined }),
    prisma.artwork.count({
      where: profile
        ? { profileId: profile.id, letters: { some: {} } }
        : { letters: { some: {} } },
    }),
  ]);

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href="/recall" className="btn btn--ghost">
          <ArrowLeft />
          되짚어보기
        </Link>
      </nav>

      <div className="closing">
        {/*
          🔴 전에는 *"{total}점을 되짚어봤습니다"*라고 적혀 있었다. **앱이 모르는 것을 말한 것이다.**
            이 화면은 마지막 한 점에서 [다음]을 눌러 오기도 하지만 주소로 바로 열 수도 있다.
            두 점만 보고 와도 화면은 *"10점을 되짚어봤습니다"*라고 말했다.
            그리고 이 서비스가 사용자에게 주려는 것이 **허락**이라, 그 앞에 놓인 문장이
            사실이 아니면 허락 자체가 값을 잃는다. 지금은 **센 것만 말한다.**
        */}
        <p className="closing__lede">
          남긴 것은 {total}점, 그중 <strong>{withQuote}점에 그때의 말이 남아 있습니다.</strong>
        </p>

        <h1 className="closing__title">이제 정리하셔도 됩니다.</h1>

        <p className="closing__body">
          <strong>여기 남은 것이 실물을 버리고 나서도 남는 전부</strong>입니다.
          {/*
            🔑 남지 않은 것도 같이 말한다.
              말이 빈 점이 있으면 그 사실을 여기서 숨기지 않는다 —
              "다 잘 남았다"고 하면 다음에 물어볼 이유가 없어진다.
          */}
          {total > withQuote ? (
            <>
              {" "}
              {total - withQuote}점은 말이 비어 있어 <strong>사진만 남습니다.</strong> 그게 이 서비스가
              말을 그 자리에서 받으려는 이유입니다.
            </>
          ) : null}
        </p>

        <div className="form__actions form__actions--center">
          <Link href="/" className="btn">
            타임라인
          </Link>
        </div>
      </div>
    </div>
  );
}
