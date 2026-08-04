import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { toDateInputValue, todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { describeAge } from "@/lib/age";
import { checkupWindows } from "@/lib/schedule";
import { ChildForm } from "./form";
import { ArrowLeft } from "../icons";

/**
 * 아이 정보 — 이 서비스에서 유일하게 "설정"에 가까운 화면.
 *
 * 🔑 이 화면이 새로 생긴 이유는 시간 축 때문이다.
 *   임신은 주차, 영아는 개월, 그 뒤는 나이로 부르는데 **셋 다 두 날짜에서만 나온다.**
 *   시드에만 넣어두면 처음 여는 사람이 그 값을 바꿔볼 수 없고,
 *   그러면 축이 어떻게 움직이는지 화면에서 확인할 방법이 없다.
 *
 * 🔴 그리고 이 화면이 **원래 나이를 안 받기로 했던 이유에 직접 답한다.**
 *   그 이유는 *"이 나이면 보통 어느 정도 그리나요?"*라는 다음 질문이었다.
 *   피해서 안 받는 대신, 받고 나서 그 질문에 답하기로 했다 — 아래 §비교 문단이 그것이다.
 */
export const dynamic = "force-dynamic";

export default async function ChildPage() {
  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  const now = getNow();
  const today = todayInputValue(now);

  // 지금이 어느 시점인지 한 줄로 보여준다. 저장 전에 값이 맞는지 여기서 검산된다.
  const nowScale = profile
    ? describeAge(new Date(`${today}T00:00:00.000Z`), {
        dueOn: profile.dueOn,
        bornOn: profile.bornOn,
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
        <h1 className="form__title">아이 정보</h1>
        <p className="form__lede">
          여기 넣은 날짜로 <strong>임신 몇 주였는지, 생후 몇 개월이었는지</strong>를 부릅니다.
          한 점마다 다시 묻지 않으려고 여기서 한 번만 받습니다.
        </p>
      </header>

      {nowScale && nowScale.scale !== "none" ? (
        <p className="tally">
          오늘 기준으로 <strong>{nowScale.label}</strong>입니다.
        </p>
      ) : null}

      {/*
        🔴 v2에서 이 두 날짜가 하는 일이 하나 늘었다 — **캘린더의 검진 창**이 여기서 나온다.
          그런데 화면은 여전히 *"임신 몇 주였는지"*까지만 말하고 있었다.
          값이 하는 일이 늘었는데 그 값을 받는 자리가 침묵하면,
          사용자는 **왜 비어 있는지 모른 채 빈 달력**을 본다.

        🔑 태어난 날이 있으면 몇 개가 잡혔는지 세어서 보여준다. 없으면 무엇이 안 보이는지 말한다.
          "넣으세요"라고 재촉하지 않는다 — 무엇이 달라지는지만 말하고 고르는 것은 사용자다.
      */}
      {profile?.bornOn ? (
        <p className="tally">
          <Link href="/calendar">캘린더</Link>에 영유아 건강검진 창{" "}
          <strong>{checkupWindows({ dueOn: profile.dueOn, bornOn: profile.bornOn }).length}개</strong>가
          이 날짜에서 계산돼 표시됩니다.
        </p>
      ) : (
        <p className="tally">
          태어난 날을 넣으면 <Link href="/calendar">캘린더</Link>에 <strong>영유아 건강검진 창</strong>이
          같이 표시됩니다. 국민건강보험공단이 정한 구간을 옮겨 적은 것입니다.
        </p>
      )}

      {profile ? (
        <ChildForm
          childName={profile.childName}
          dueOn={profile.dueOn ? toDateInputValue(profile.dueOn) : ""}
          bornOn={profile.bornOn ? toDateInputValue(profile.bornOn) : ""}
          today={today}
        />
      ) : (
        <div className="blank">
          <h2 className="blank__title">아이 정보를 찾지 못했습니다.</h2>
          <p className="blank__body">컨테이너를 다시 시작하면 초기 데이터가 만들어집니다.</p>
          <Link href="/" className="btn">
            타임라인
          </Link>
        </div>
      )}

      {/*
        🔴 이 문단이 이 화면의 핵심이다.
          생년월일을 안 받기로 했던 이유가 *"이 나이면 보통 어느 정도인가요"*라는
          다음 질문이었다. 받기로 한 이상 **그 질문에 답해야 한다.**
          답하지 않고 날짜만 받으면, 화면이 나이를 왜 물었는지 설명하지 못한다.
      */}
      <section className="note" aria-labelledby="compare-h">
        <h2 className="section__h" id="compare-h">
          &ldquo;이 나이면 보통 어느 정도인가요?&rdquo;
        </h2>
        <p className="note__body">
          <strong>여기서는 답하지 않습니다.</strong> 날짜는 <em>언제였는지</em>를 부르는 데만 씁니다.
        </p>
        <p className="note__body">
          같은 나이라도 아이마다 다르고, 그 폭은 기준을 만드는 쪽이 생각하는 것보다 넓습니다.
          그림으로 발달을 읽는 검사들은 이미 아는 것에 더해 새로 맞히는 것이 거의 없다고 알려져 있고,
          널리 인용되는 발달 단계 구분도 <strong>한 칸이 몇 해에 걸칠 만큼 넓습니다.</strong>
        </p>
        <p className="note__body">
          그런데 앱이 <em>&ldquo;이 나이면 보통 이 정도&rdquo;</em>라고 한 줄만 띄우면 부모는 그걸 믿습니다.
          <strong> 그리고 틀렸을 때 대가를 치르는 것은 아이입니다.</strong>
          그래서 이 서비스에는 축은 있고 잣대는 없습니다.
        </p>
      </section>
    </div>
  );
}
