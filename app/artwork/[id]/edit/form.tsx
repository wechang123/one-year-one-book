"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { describeAge, type Birth } from "@/lib/age";
import { parseDateInputValue } from "@/lib/date";
import { QuoteField } from "../../quote-field";
import { updateArtwork, type EditArtworkState } from "./actions";

const INITIAL: EditArtworkState = {};

export function EditArtworkForm({
  id,
  childQuote,
  quoteBy,
  madeOn,
  today,
  birth,
}: {
  id: string;
  childQuote: string;
  quoteBy: "CHILD" | "PARENT";
  /** "2026-07-19" */
  madeOn: string;
  today: string;
  birth: Birth;
}) {
  const [state, formAction] = useActionState(updateArtwork, INITIAL);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.field === "madeOn") dateRef.current?.focus();
  }, [state]);

  // 등록 폼과 같은 이유다 — 날짜가 말의 주인과 시간 축을 같이 정한다.
  const [madeOnValue, setMadeOnValue] = useState(state.values?.madeOn || madeOn);
  useEffect(() => {
    if (state.values?.madeOn) setMadeOnValue(state.values.madeOn);
  }, [state]);

  const madeOnDate = parseDateInputValue(madeOnValue);
  const when = madeOnDate ? describeAge(madeOnDate, birth) : null;

  return (
    <form action={formAction} className="form" noValidate>
      <input type="hidden" name="id" value={id} />

      {state.error ? (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      {/* 등록 폼과 순서를 맞춘다. 날짜가 이 자리에 무엇을 적어야 하는지를 정한다. */}
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
          onChange={(e) => setMadeOnValue(e.target.value)}
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
          {when && when.scale !== "none" ? (
            <>
              <br />
              이때는 <strong>{when.label}</strong>입니다.
            </>
          ) : null}
        </p>
      </div>

      <QuoteField
        birth={birth}
        madeOn={madeOnDate}
        defaultQuote={state.values?.childQuote ?? childQuote}
        defaultQuoteBy={state.values?.quoteBy ?? quoteBy}
      />

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
