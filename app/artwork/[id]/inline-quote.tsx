"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addLetter, type LetterState } from "./letter-actions";

const INITIAL: LetterState = {};

/**
 * 등록 직후, 말이 비어 있을 때만 나오는 인라인 입력.
 *
 * 🔑 왜 여기에 입력칸을 두나
 *   말은 **그 자리에서 안 물어보면 영영 얻을 수 없다.** 등록 직후는 아이가 아직 옆에 있는
 *   유일한 순간이고, 편지 더하기까지 한 번 더 눌러야 한다면 그 순간이 지나간다.
 *
 * 🔴 전에는 updateArtwork로 작품의 말 컬럼을 덮어썼다. 지금은 **첫 편지를 만든다** —
 *   같은 폼이 같은 자리에서 같은 일을 하지만, 이제 나중에 온 말을 덮어쓰지 않는다.
 *   쓴 날을 만든 날로 고정해 보내는 것이 이 폼의 정체다: 여기서 받는 말은
 *   "그때의 말"이고, 오늘 쓴 편지는 아래 [편지 더하기]가 받는다.
 *
 * 🔑 이 폼이 화면에서 갖는 무게
 *   "지금 적기"와 "그대로 두셔도 됩니다"를 **같은 크기**로 뒀다.
 *   비워두는 것을 더 크게 쓰면 앱이 스스로 "안 해도 된다"고 밀어내는 것이고,
 *   더 작게 쓰면 비워두는 것이 실패로 읽힌다. **둘 다 정상이라고 말해야 한다.**
 */
export function InlineQuoteForm({
  id,
  madeOn,
  quoteBy,
}: {
  id: string;
  madeOn: string;
  /**
   * 🔑 여기서는 **고르게 하지 않는다.** 이 폼은 등록 직후 한 칸짜리다.
   *   말의 주인은 시기가 제안하고(태어나기 전이면 서버가 부모로 확정한다),
   *   바꾸려면 저장 뒤 편지의 [고치기]로 가면 된다 — 여기서 라디오까지 띄우면
   *   "지금 한 줄만 적으면 된다"는 이 자리의 성질이 무너진다.
   */
  quoteBy: "CHILD" | "PARENT";
}) {
  const [state, formAction] = useActionState(addLetter, INITIAL);

  return (
    <form action={formAction} className="inlinequote" noValidate>
      <input type="hidden" name="artworkId" value={id} />
      {/* 그때의 말이다 — 쓴 날이 곧 만든 날. 오늘 쓴 편지는 [편지 더하기]가 받는다. */}
      <input type="hidden" name="writtenOn" value={madeOn} />
      <input type="hidden" name="writtenBy" value={quoteBy} />

      {state.error ? (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <label className="field__label" htmlFor="inline-quote">
        지금 적어두기
      </label>
      <textarea
        id="inline-quote"
        name="body"
        rows={2}
        className="field__input"
        defaultValue={state.values?.body ?? ""}
        placeholder={
          quoteBy === "CHILD"
            ? "아이가 한 말을 그대로 적어주세요"
            : "지금 본 것, 지금 하고 싶은 말을 그대로 적어주세요"
        }
        aria-describedby="inline-quote-help"
      />
      <p className="field__help" id="inline-quote-help">
        {quoteBy === "CHILD" ? (
          <>
            <strong>&ldquo;이거 무슨 얘기야?&rdquo;</strong> 하고 물어보면 이야기가 나옵니다.
          </>
        ) : (
          <>
            아이가 아직 말을 안 하는 시기라 <strong>부모의 말</strong>로 남습니다.
          </>
        )}
      </p>

      <div className="inlinequote__actions">
        <SaveButton />
        {/*
          🔑 "그대로 두셔도 됩니다"가 버튼 옆에 같은 크기로 있다.
            누를 것이 아니라 사실이라 링크가 아니다 — 아무것도 안 하면 그렇게 된다.
        */}
        <span className="inlinequote__ok">그대로 두셔도 됩니다</span>
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "저장하는 중…" : "저장하기"}
    </button>
  );
}
