import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn, toDateInputValue, todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { letterTiming } from "@/lib/letter";
import { deleteLetter } from "../../../artwork/[id]/letter-actions";
import { LetterForm } from "../../../artwork/[id]/letter-form";
import { SaidBy } from "../../../artwork/said-by";
import { ArrowLeft } from "../../../icons";

/**
 * 편지 한 통 고치기 — 그리고 지우기.
 *
 * 🔑 편집 단위가 통이다. 작품 편집 화면은 만든 날(작품의 것)만 만지고,
 *   말은 전부 여기서 통별로 만진다. 한 칸이 여러 통을 상대하면
 *   어느 통을 고치는 중인지 화면이 말할 수 없다.
 *
 * 🔑 지우기는 두 단계다(?del=1). JS confirm이 아니라 화면이라
 *   JS 없이 동작하고, 사라질 본문이 눈앞에 놓인 채로 결정하게 된다.
 *   삭제를 허용한 근거는 letter-actions.ts의 deleteLetter 머리말에 있다.
 */
export const dynamic = "force-dynamic";

export default async function EditLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ del?: string }>;
}) {
  const [{ id }, { del }] = await Promise.all([params, searchParams]);
  const prisma = getPrisma();

  const letter = await prisma.letter.findUnique({
    where: { id },
    select: {
      id: true,
      body: true,
      writtenBy: true,
      writtenOn: true,
      artwork: {
        select: {
          id: true,
          madeOn: true,
          profile: { select: { dueOn: true, bornOn: true } },
        },
      },
    },
  });

  if (!letter) notFound();

  const birth = {
    dueOn: letter.artwork.profile.dueOn,
    bornOn: letter.artwork.profile.bornOn,
  };
  const timing = letterTiming(letter.artwork.madeOn, letter.writtenOn);

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href={`/artwork/${letter.artwork.id}`} className="btn btn--ghost">
          <ArrowLeft />이 한 장으로
        </Link>
      </nav>

      <header className="form__head">
        <h1 className="form__title">편지 고치기</h1>
        <p className="form__lede">
          {formatMadeOn(letter.artwork.madeOn)}에 만든 기록에{" "}
          {timing ? (
            <>
              <strong>{timing}</strong> 쓴 편지입니다.
            </>
          ) : (
            <>그때 받은 말로 남은 편지입니다.</>
          )}
        </p>
      </header>

      {/* 어떤 기록의 편지인지 눈으로 확인한다. 편집 화면의 썸네일과 같은 이유다. */}
      <figure className="editthumb">
        <img className="editthumb__img" src={`/api/photo/${letter.artwork.id}`} alt="" />
      </figure>

      {del === "1" ? (
        /*
         * 🔑 확인 화면. 지워질 본문을 그대로 보여준다 —
         *   "정말 지울까요?"는 무엇이 사라지는지 보여줄 때만 질문 구실을 한다.
         */
        <div className="delconfirm" role="alertdialog" aria-labelledby="del-h">
          <h2 className="delconfirm__title" id="del-h">
            이 편지를 지울까요?
          </h2>
          <blockquote className="delconfirm__quote">
            <SaidBy by={letter.writtenBy} always /> {letter.body}
          </blockquote>
          <p className="delconfirm__note">
            지우면 되돌릴 수 없습니다. 시드 편지라면 [처음 상태로 되돌리기]가 복구합니다.
          </p>
          <div className="form__actions">
            <form action={deleteLetter}>
              <input type="hidden" name="letterId" value={letter.id} />
              <button type="submit" className="btn btn--danger">
                지우기
              </button>
            </form>
            <Link href={`/letter/${letter.id}/edit`} className="btn btn--ghost">
              그만두기
            </Link>
          </div>
        </div>
      ) : (
        <>
          <LetterForm
            mode="edit"
            artworkId={letter.artwork.id}
            letterId={letter.id}
            madeOn={toDateInputValue(letter.artwork.madeOn)}
            birth={birth}
            today={todayInputValue(getNow())}
            defaultBody={letter.body}
            defaultBy={letter.writtenBy}
            defaultWrittenOn={toDateInputValue(letter.writtenOn)}
          />

          {/* 지우기는 저장 옆이 아니라 아래 따로 — 실수로 닿는 자리에 두지 않는다. */}
          <p className="letteredit__del">
            <Link href={`/letter/${letter.id}/edit?del=1`} className="btn btn--ghost btn--danger-ghost">
              이 편지 지우기
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
