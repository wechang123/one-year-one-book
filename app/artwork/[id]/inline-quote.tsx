"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateArtwork, type EditArtworkState } from "./edit/actions";

const INITIAL: EditArtworkState = {};

/**
 * 등록 직후, 말이 비어 있을 때만 나오는 인라인 입력.
 *
 * 🔑 왜 여기에 입력칸을 두나
 *   말은 **그 자리에서 안 물어보면 영영 얻을 수 없다.** 등록 직후는 아이가 아직 옆에 있는
 *   유일한 순간이고, 편집 화면까지 두 번 더 눌러야 한다면 그 순간이 지나간다.
 *
 * 🔑 새 액션을 만들지 않는다
 *   updateArtwork를 그대로 쓴다. 검증·오류 처리·입력 보존이 이미 거기 있고,
 *   같은 일을 하는 경로가 둘이면 한쪽만 고쳤을 때 갈라진다.
 *   madeOn을 숨은 값으로 같이 보내는 이유도 그것이다 — 액션의 계약을 바꾸지 않는다.
 *
 * 🔑 이 폼이 화면에서 갖는 무게
 *   "지금 적기"와 "그대로 두셔도 됩니다"를 **같은 크기**로 뒀다.
 *   비워두는 것을 더 크게 쓰면 앱이 스스로 "안 해도 된다"고 밀어내는 것이고,
 *   더 작게 쓰면 비워두는 것이 실패로 읽힌다. **둘 다 정상이라고 말해야 한다.**
 */
export function InlineQuoteForm({ id, madeOn }: { id: string; madeOn: string }) {
  const [state, formAction] = useActionState(updateArtwork, INITIAL);

  return (
    <form action={formAction} className="inlinequote" noValidate>
      <input type="hidden" name="id" value={id} />
      {/* 날짜는 바꾸지 않는다. 액션이 요구하는 값이라 그대로 되돌려 보낸다. */}
      <input type="hidden" name="madeOn" value={madeOn} />

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
        name="childQuote"
        rows={2}
        className="field__input"
        defaultValue={state.values?.childQuote ?? ""}
        placeholder="아이가 한 말을 그대로 적어주세요"
        aria-describedby="inline-quote-help"
      />
      <p className="field__help" id="inline-quote-help">
        <strong>&ldquo;이거 무슨 얘기야?&rdquo;</strong> 하고 물어보면 이야기가 나옵니다.
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
