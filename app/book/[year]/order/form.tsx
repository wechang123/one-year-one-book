"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createOrder, type NewOrderState } from "./actions";

const INITIAL: NewOrderState = {};

export function NewOrderForm({ year }: { year: number }) {
  const [state, formAction] = useActionState(createOrder, INITIAL);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.field === "recipientName") nameRef.current?.focus();
    if (state.field === "recipientPhone") phoneRef.current?.focus();
    if (state.field === "address") addressRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="form" noValidate>
      <input type="hidden" name="year" value={year} />

      {state.error ? (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="recipientName">
          받는 분 <span className="field__req">필수</span>
        </label>
        <input
          ref={nameRef}
          id="recipientName"
          name="recipientName"
          type="text"
          className="field__input"
          maxLength={40}
          autoComplete="name"
          defaultValue={state.values?.recipientName ?? ""}
          aria-describedby="name-help"
        />
        <p className="field__help" id="name-help">
          {/*
            받는 사람이 주문한 사람과 다를 수 있다는 걸 화면이 먼저 말한다.
            "할머니 드릴 한 권"이 이 서비스에서 드문 일이 아니다.
          */}
          선물이면 받으실 분 이름으로 적어주세요.
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="recipientPhone">
          연락처 <span className="field__req">필수</span>
        </label>
        <input
          ref={phoneRef}
          id="recipientPhone"
          name="recipientPhone"
          /* type="tel"이라 폰에서 숫자 키패드가 먼저 뜬다. */
          type="tel"
          className="field__input"
          inputMode="tel"
          autoComplete="tel"
          placeholder="010-1234-5678"
          defaultValue={state.values?.recipientPhone ?? ""}
          aria-describedby="phone-help"
        />
        <p className="field__help" id="phone-help">
          주문에 문제가 생겼을 때만 씁니다. 안심번호·국가번호를 붙여도 됩니다.
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="address">
          받으실 주소 <span className="field__req">필수</span>
        </label>
        <textarea
          ref={addressRef}
          id="address"
          name="address"
          rows={3}
          className="field__input"
          maxLength={200}
          autoComplete="street-address"
          defaultValue={state.values?.address ?? ""}
          aria-describedby="address-help"
        />
        <p className="field__help" id="address-help">
          동·호수까지 적어주세요.
        </p>
      </div>

      <div className="form__actions">
        <SubmitButton />
        <Link href={`/book/${year}`} className="btn btn--ghost">
          그만두기
        </Link>
      </div>
    </form>
  );
}

/**
 * 🔑 이 버튼이 하는 일과 서버가 하는 일이 다르다.
 *   여기서 잠그는 것은 **두 번 누르는 일 자체를 줄이는 것**이다 —
 *   느린 회선에서 화면이 그대로면 사용자는 안 눌렸다고 보고 다시 누른다.
 *   **두 번 눌렸을 때 두 건이 생기는 것을 막는 일은 서버가 한다**(actions.ts).
 *   새로고침 후 재전송처럼 버튼이 관여할 수 없는 경로가 있기 때문이다.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "주문을 넣는 중…" : "주문 넣기"}
    </button>
  );
}
