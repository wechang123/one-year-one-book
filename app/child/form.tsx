"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { updateChild, type ChildState } from "./actions";

const INITIAL: ChildState = {};

export function ChildForm({
  childName,
  dueOn,
  bornOn,
  today,
}: {
  childName: string;
  /** "2019-03-08" 또는 빈 문자열 */
  dueOn: string;
  bornOn: string;
  today: string;
}) {
  const [state, formAction] = useActionState(updateChild, INITIAL);
  const nameRef = useRef<HTMLInputElement>(null);
  const dueRef = useRef<HTMLInputElement>(null);
  const bornRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.field === "childName") nameRef.current?.focus();
    if (state.field === "dueOn") dueRef.current?.focus();
    if (state.field === "bornOn") bornRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="form" noValidate>
      {state.error ? (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="childName">
          아이 이름 <span className="field__req">필수</span>
        </label>
        <input
          ref={nameRef}
          id="childName"
          name="childName"
          type="text"
          className="field__input"
          defaultValue={state.values?.childName ?? childName}
          maxLength={20}
          aria-describedby="name-help"
        />
        <p className="field__help" id="name-help">
          책 표지에 들어갑니다. 부르는 이름이면 됩니다.
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="dueOn">
          출산예정일
        </label>
        <input
          ref={dueRef}
          id="dueOn"
          name="dueOn"
          type="date"
          className="field__input field__input--date"
          defaultValue={state.values?.dueOn ?? dueOn}
          aria-describedby="due-help"
        />
        <p className="field__help" id="due-help">
          {/*
            🔑 왜 태어난 날로 대신할 수 없는지를 여기서 말한다.
              두 칸이 나란히 있으면 사용자는 "왜 둘 다 필요하지?"를 반드시 묻는다.
              묻기 전에 답해두지 않으면 하나를 비워두고, 그러면 임신 구간의 주차가 사라진다.
          */}
          <strong>임신 주차는 이 날짜에서만 나옵니다.</strong> 태어난 날에서 거꾸로 세면
          일찍·늦게 태어난 만큼 지난 기록의 주차가 통째로 밀립니다. 태어난 뒤에도 지우지 마세요.
          <br />
          미래여도 됩니다 — 지금 임신 중이라는 뜻입니다.
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="bornOn">
          태어난 날
        </label>
        <input
          ref={bornRef}
          id="bornOn"
          name="bornOn"
          type="date"
          className="field__input field__input--date"
          defaultValue={state.values?.bornOn ?? bornOn}
          max={today}
          aria-describedby="born-help"
        />
        <p className="field__help" id="born-help">
          생후 며칠·몇 개월·만 몇 살은 이 날짜에서 나옵니다.
          <br />
          아직 안 태어났으면 비워두세요. <strong>두 칸이 다 비어 있어도 앱은 그대로 돌아갑니다</strong> —
          그때는 날짜만 보입니다.
        </p>
      </div>

      <div className="form__actions">
        <SubmitButton />
        <Link href="/" className="btn btn--ghost">
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
