import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { toDateInputValue, todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { EditArtworkForm } from "./form";
import { ArrowLeft } from "../../../icons";

/**
 * 작품 편집 — 만든 날.
 *
 * 🔑 여기서 고칠 수 있는 것은 만든 날뿐이다.
 *   사진은 원래 못 바꾼다(그 근거와 파급은 ./actions.ts 머리말에).
 *   말은 편지가 되면서 통별 편집(/letter/[id]/edit)으로 나갔다 —
 *   같은 편지를 고치는 경로가 둘이면 갈라진다.
 */
export const dynamic = "force-dynamic";

export default async function EditArtworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();

  const artwork = await prisma.artwork.findUnique({
    where: { id },
    // 여기서도 사진 바이트는 안 읽는다. 썸네일은 <img>가 따로 받아온다.
    // 편지는 안 읽는다 — 말은 통별 편집(/letter/[id]/edit)의 몫이다.
    select: { id: true, madeOn: true },
  });

  if (!artwork) notFound();

  const profile = await prisma.profile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { dueOn: true, bornOn: true },
  });

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href={`/artwork/${artwork.id}`} className="btn btn--ghost">
          <ArrowLeft />
          이 한 점으로
        </Link>
      </nav>

      <header className="form__head">
        <h1 className="form__title">만든 날 고치기</h1>
      </header>

      {/*
        어떤 것을 고치는 중인지 보여준다. 목록에 비슷한 사진이 여러 장이면
        폼만 놓았을 때 엉뚱한 것을 고칠 수 있다.
      */}
      <figure className="editthumb">
        <img className="editthumb__img" src={`/api/photo/${artwork.id}`} alt="" />
        <figcaption className="editthumb__caption">
          사진은 바꿀 수 없어요. 등록할 때 미리보기로 먼저 확인하게 되어 있습니다.
        </figcaption>
      </figure>

      <EditArtworkForm
        id={artwork.id}
        madeOn={toDateInputValue(artwork.madeOn)}
        today={todayInputValue(getNow())}
        birth={{ dueOn: profile?.dueOn ?? null, bornOn: profile?.bornOn ?? null }}
      />
    </div>
  );
}
