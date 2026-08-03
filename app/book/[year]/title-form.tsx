"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { renameBook, type BookActionState } from "../actions";

const INITIAL: BookActionState = {};

/**
 * 표지 제목 고치기.
 *
 * 🔑 화면을 하나 더 만들지 않았다.
 *   제목만 고치자고 편집 화면을 따로 두면 클릭이 하나 늘고, 고친 결과를 보려면 또 돌아와야 한다.
 *   <details>는 브라우저가 여닫는 것이라 JS 없이도 열리고, 평소에는 접혀 있어서
 *   이 화면의 주인공(작품 격자)을 가리지 않는다.
 *
 * 🔑 왜 기본값을 제안하고 고치게 두는가
 *   제목은 시스템의 값이 아니라 부모의 말이다. 그런데 처음부터 빈칸을 주면
 *   "무엇을 만드는지 모르는 상태에서 이름부터 지으라"는 요구가 된다.
 *   먼저 만들어 보여주고, 표지를 보면서 고치게 한다.
 */
export function BookTitleForm({ year, title }: { year: number; title: string }) {
  const [state, formAction] = useActionState(renameBook, INITIAL);

  return (
    <details className="titleedit">
      <summary className="titleedit__toggle">표지 제목 고치기</summary>

      <form action={formAction} className="titleedit__form" noValidate>
        <input type="hidden" name="year" value={year} />

        {state.error ? (
          <p className="form__error" role="alert">
            {state.error}
          </p>
        ) : null}

        <label className="field__label" htmlFor="title">
          표지에 들어갈 말
        </label>
        <div className="titleedit__row">
          <input
            id="title"
            name="title"
            type="text"
            className="field__input"
            defaultValue={title}
            maxLength={60}
          />
          <SaveButton />
        </div>
        <p className="field__help">아이가 부르는 말로 바꿔도 됩니다. 표지에 그대로 들어갑니다.</p>
      </form>
    </details>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "저장하는 중…" : "저장"}
    </button>
  );
}
