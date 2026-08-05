import Link from "next/link";
import { todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { getPrisma } from "@/lib/prisma";
import { NewArtworkForm } from "./form";
import { ArrowLeft } from "../../icons";

/**
 * 작품 등록.
 *
 * 🔑 등록에 창(window)·주기 규칙이 없다.
 *   이 서비스의 트리거는 앱 밖에 있다 — 아이가 그림을 들고 오는 것이다.
 *   그건 앱이 만들지 않아도 반드시 일어나므로, 앱이 할 일은 그때 열려 있는 것뿐이다.
 *
 * 🔑 "오늘"을 서버에서 계산해 내려보낸다.
 *   폼에서 만들면 사용자 기기의 시간대를 따라가 컨테이너와 다른 날짜가 나올 수 있다.
 *   만든 날은 어느 해 책에 들어갈지를 정하는 값이라 하루가 밀리면 책이 바뀐다.
 */

/**
 * 🔑 이 선언이 없으면 이 화면만 빌드 시점에 미리 그려진다.
 *   DB를 안 읽는 유일한 화면이라 Next가 정적으로 판단하고, 그 결과
 *   기본 날짜와 max 속성이 **빌드한 날에 고정된다.**
 *   컨테이너를 한 번 띄워두고 며칠 쓰면 "오늘"이 며칠 전으로 굳는다.
 *   화면을 열 때마다 오늘이어야 하는 값이라 매번 그린다.
 */
export const dynamic = "force-dynamic";

export default async function NewArtworkPage() {
  const today = todayInputValue(getNow());
  const prisma = getPrisma();

  const profile = await prisma.profile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, dueOn: true, bornOn: true },
  });

  /**
   * 🔑 마지막으로 고른 말의 주인을 기본값으로 되돌려준다.
   *   아이가 말을 시작하는 시점은 아이마다 다르고 **앱은 그걸 모른다. 부모는 안다.**
   *   그래서 앱이 추측하는 대신 **직전 선택을 그대로 다시 제안한다** —
   *   한 번 고르면 그 뒤로는 대체로 같고, 바뀌는 날에만 한 번 더 고르면 된다.
   */
  const last = profile
    ? await prisma.letter.findFirst({
        // 직전 선택은 이제 마지막 **편지**에 남아 있다. 말을 안 남긴 등록은 선택도 안 남긴 것이다.
        where: { artwork: { profileId: profile.id } },
        orderBy: { createdAt: "desc" },
        select: { writtenBy: true },
      })
    : null;

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href="/" className="btn btn--ghost">
          <ArrowLeft />
          타임라인
        </Link>
      </nav>

      <header className="form__head">
        <h1 className="form__title">한 점 남기기</h1>
        <p className="form__lede">
          {/*
            여기서 이미 목적을 말해둔다. 저장 후에 처음 듣는 것보다,
            무엇을 위해 적는지 알고 적는 편이 그때의 말을 더 정확히 받아적게 만든다.
          */}
          사진과 그때의 말을 남겨두면, 한 해가 지나 한 권으로 묶입니다.
        </p>
      </header>

      <NewArtworkForm
        today={today}
        birth={{ dueOn: profile?.dueOn ?? null, bornOn: profile?.bornOn ?? null }}
        lastQuoteBy={last?.writtenBy ?? "CHILD"}
      />
    </div>
  );
}
