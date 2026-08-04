"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetDemo, type ResetState } from "./actions";

const INITIAL: ResetState = {};

/**
 * [처음 상태로 되돌리기]
 *
 * 🔑 두 동작으로 나눴다 — 펼치기, 그리고 누르기.
 *   되돌릴 수 없는 버튼이라 한 번에 눌리면 안 된다.
 *   그렇다고 confirm() 대화상자를 쓰지 않았다 — 그건 무엇이 지워지는지 설명할 자리가 없다.
 *   <details>를 열면 **무엇이 지워지고 무엇이 남는지**를 읽고 나서 누르게 된다.
 *   브라우저가 여닫는 것이라 JS 없이도 열린다.
 */
export function DemoResetButton() {
  const [state, formAction] = useActionState(resetDemo, INITIAL);

  return (
    <details className="reset">
      <summary className="reset__toggle">처음 상태로 되돌리기</summary>

      <div className="reset__body">
        {state.error ? (
          <p className="form__error" role="alert">
            {state.error}
          </p>
        ) : null}

        {state.done ? (
          <p className="saved" role="status">
            <strong>처음 상태로 되돌렸습니다.</strong>
            <span className="saved__sub">
              직접 남기신 것과 책·주문을 모두 지우고, 처음부터 있던 것의 말과 날짜를
              원래대로 돌려놨습니다.
            </span>
          </p>
        ) : null}

        <p className="reset__what">
          <strong>지워지는 것</strong>: 직접 등록한 사진과 말, 직접 만든 책과 그 책의 주문·이력
          <br />
          <strong>남는 것</strong>: 처음부터 있던 것. 그중 말이나 날짜를 고치셨다면{" "}
          <strong>원래 문장으로 되돌아갑니다.</strong>
        </p>

        <form action={formAction}>
          <ResetSubmit />
        </form>
      </div>
    </details>
  );
}

function ResetSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--ghost" disabled={pending}>
      {pending ? "되돌리는 중…" : "되돌리기"}
    </button>
  );
}
