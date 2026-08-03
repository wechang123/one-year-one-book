import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { isOngoing, parseYear, yearRange } from "@/lib/book";
import { NewOrderForm } from "./form";

/**
 * 주문 폼.
 *
 * 🔑 지금 무엇을 주문하는지 먼저 보여준다.
 *   주문 화면에서 사용자가 가장 불안한 건 "내가 맞는 걸 주문하고 있나"다.
 *   책 제목과 몇 점이 담기는지를 폼 위에 두면 그 질문이 화면에서 끝난다.
 */
export const dynamic = "force-dynamic";

export default async function NewOrderPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearParam } = await params;
  const year = parseYear(yearParam);
  if (year === null) notFound();

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!profile) notFound();

  const [book, count] = await Promise.all([
    prisma.collection.findUnique({
      where: { profileId_year: { profileId: profile.id, year } },
      select: { title: true },
    }),
    prisma.artwork.count({ where: { profileId: profile.id, madeOn: yearRange(year) } }),
  ]);

  // 책을 안 만들었으면 주문할 대상이 없다. 만드는 자리는 홈이다.
  if (!book) notFound();

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href={`/book/${year}`} className="btn btn--ghost">
          ← 책으로
        </Link>
      </nav>

      <header className="form__head">
        <h1 className="form__title">주문 넣기</h1>
        <p className="form__lede">
          <strong>{book.title}</strong> · {year}년 {count}점
          {isOngoing(year) ? (
            <>
              {/*
                🔑 진행 중인 해를 주문하는 것은 막지 않되, 무엇을 주문하는지는 밝힌다.
                  "12월에 만들면 더 들어가나요?"는 주문 뒤에 나올 질문이라 미리 답해둔다.
              */}
              <br />
              <span className="form__note">
                아직 진행 중인 해입니다. 지금 담긴 {count}점으로 주문됩니다.
              </span>
            </>
          ) : null}
        </p>
      </header>

      {/*
        🔑 무엇을 안 받는지도 화면이 말한다.
          결제 칸이 없는 것을 "아직 안 만든 것"으로 읽으면 주문을 넣고 기다리게 된다.
          여기서 끝나는 단계라는 걸 밝혀야 다음 행동을 오해하지 않는다.
      */}
      <p className="notice">
        결제와 배송은 아직 연결되어 있지 않습니다. 이 화면은 <strong>주문을 접수하고 진행 상태를
        관리하는 데까지</strong>입니다. 실제 제작은 이뤄지지 않습니다.
      </p>

      <NewOrderForm year={year} />
    </div>
  );
}
