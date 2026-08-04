"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { updateArtwork, type EditArtworkState } from "./actions";

const INITIAL: EditArtworkState = {};

export function EditArtworkForm({
  id,
  childQuote,
  madeOn,
  today,
}: {
  id: string;
  childQuote: string;
  /** "2026-07-19" */
  madeOn: string;
  today: string;
}) {
  const [state, formAction] = useActionState(updateArtwork, INITIAL);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.field === "madeOn") dateRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="form" noValidate>
      <input type="hidden" name="id" value={id} />

      {state.error ? (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="childQuote">
          아이가 한 말
        </label>
        <textarea
          id="childQuote"
          name="childQuote"
          rows={3}
          className="field__input"
          /*
           * 🔑 defaultValue다. value로 두면 매 글자마다 리렌더가 필요한 제어 컴포넌트가 되고,
           *   그 상태를 관리할 이유가 없다 — 이 폼은 제출할 때 한 번만 값을 읽는다.
           */
          defaultValue={state.values?.childQuote ?? childQuote}
          placeholder="아이가 한 말을 그대로 적어주세요"
          aria-describedby="quote-help"
        />
        <p className="field__help" id="quote-help">
          {/* 등록 폼과 같은 질문을 제안한다. 두 화면이 다른 질문을 시키면 말이 갈린다. */}
          <strong>&ldquo;이거 무슨 얘기야?&rdquo;</strong> 하고 물어보면 이야기가 나옵니다.
          <br />
          비우면 &ldquo;아직 안 물어봤어요&rdquo;로 돌아갑니다.
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="madeOn">
          만든 날
        </label>
        <input
          ref={dateRef}
          id="madeOn"
          name="madeOn"
          type="date"
          className="field__input field__input--date"
          defaultValue={state.values?.madeOn || madeOn}
          max={today}
          aria-describedby="date-help"
        />
        <p className="field__help" id="date-help">
          {/*
            숨은 결과를 미리 말해준다. 수록작은 madeOn의 연도로 계산하므로
            (schema.prisma의 Collection) 연도를 고치면 담기는 책이 바뀐다.
            화면이 말하지 않으면 나중에 책을 만들 때 왜 빠졌는지 알 수 없다.
          */}
          연도를 바꾸면 담기는 책이 바뀝니다. 책은 한 해에 한 권입니다.
        </p>
      </div>

      <div className="form__actions">
        <SubmitButton />
        <Link href={`/artwork/${id}`} className="btn btn--ghost">
          그만두기
        </Link>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "저장하는 중…" : "저장하기"}
    </button>
  );
}
