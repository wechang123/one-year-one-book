"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { describeAge, type Birth } from "@/lib/age";
import { parseDateInputValue } from "@/lib/date";
import { updateArtwork, type EditArtworkState } from "./actions";

const INITIAL: EditArtworkState = {};

/**
 * 만든 날 폼.
 *
 * 🔴 여기 아이 말 칸(QuoteField)이 있었다. 편지가 통별 편집(/letter/[id]/edit)을
 *   갖게 되면서 걷었다 — 같은 편지를 고치는 경로가 둘이면 갈라진다.
 *   이 폼에 남은 것은 작품 자신의 값, 만든 날 하나다.
 */
export function EditArtworkForm({
  id,
  madeOn,
  today,
  birth,
}: {
  id: string;
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
            그리고 그때 받은 말(쓴 날 = 만든 날인 편지)의 쓴 날도 같이 움직인다.
          */}
          연도를 바꾸면 담기는 책이 바뀝니다. 그때 받은 편지의 쓴 날도 함께 움직입니다.
          {when && when.scale !== "none" ? (
            <>
              <br />
              이때는 <strong>{when.label}</strong>입니다.
            </>
          ) : null}
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
