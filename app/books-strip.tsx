"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createBook, type BookActionState } from "./book/actions";
import { BookOpen, BookPlus } from "./icons";

const INITIAL: BookActionState = {};

export type YearRow = {
  year: number;
  count: number;
  ongoing: boolean;
  /** 이미 만든 책의 제목. 아직 안 만들었으면 null. */
  bookTitle: string | null;
};

/**
 * 홈의 "책" 줄.
 *
 * 🔴 이 주석이 한때 *"책은 부가 기능이 아니라 목적이다"*라고 적혀 있었다. 뒤집혔다.
 *   **서비스가 다루는 것은 콘텐츠**(아이가 남긴 것과 그때의 말)이고, 책은 그 콘텐츠를
 *   활용하는 쪽이다. 책은 **사용자의 목적**이지 서비스의 본체가 아니다 —
 *   받아둔 것이 없으면 묶을 것도 없다.
 *   화면은 이미 그렇게 고쳐졌는데(작품 격자가 위, 이 줄이 아래) **주석만 옛 선언으로 남아 있었다.**
 *   코드를 그리는 파일이 코드와 반대로 말하고 있었던 것이라, 여기가 제일 늦게 걸린 자리다.
 *
 * 🔑 그래도 홈에 둔다
 *   별도 메뉴 뒤에 숨기면 "언젠가 하는 일"이 되고, 책 만들기 → 주문 → 상태 변경으로 가는
 *   동선이 끊긴다. 시드가 책·주문을 0건으로 비워둔 것도 그 동선을 직접 밟아보라는 배치다.
 *
 * 🔑 등록 버튼보다 아래에 둔다
 *   주 사용자가 여는 이유는 여전히 "손에 뭔가 들려 있어서"다. 그게 30초짜리 일이고,
 *   책은 한 해에 한 번이다. 빈도가 높은 것이 위에 있어야 한다.
 */
export function BooksStrip({ rows, orderCount }: { rows: YearRow[]; orderCount: number }) {
  const [state, formAction] = useActionState(createBook, INITIAL);

  if (rows.length === 0) return null;

  return (
    <section className="books" aria-labelledby="books-h">
      <h2 className="books__h" id="books-h">
        한 해가 한 권
        {/*
          주문이 생긴 뒤에만 링크가 나온다. 0건일 때 "주문 0건"을 보여주면
          아직 할 수 없는 일을 화면이 먼저 말하는 셈이 된다 — 책부터 묶어야 한다.
        */}
        {orderCount > 0 ? (
          <>
            {" · "}
            <Link href="/orders" className="books__link">
              주문 {orderCount}건
            </Link>
          </>
        ) : null}
      </h2>

      {state.error ? (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <ul className="books__list">
        {rows.map((row) => (
          <li key={row.year} className="books__row">
            <div className="books__meta">
              <span className="books__year">{row.year}년</span>
              <span className="books__count">
                {/*
                  🔑 진행 중인 해에 "10점"이라고만 쓰면 그게 그 해의 전부처럼 읽힌다.
                    지어낸 완결감을 만들지 않는다.
                */}
                {row.ongoing ? `진행 중 · 지금까지 ${row.count}점` : `${row.count}점`}
              </span>
              {row.bookTitle ? <span className="books__title">{row.bookTitle}</span> : null}
            </div>

            {row.bookTitle ? (
              <Link href={`/book/${row.year}`} className="btn btn--ghost">
                <BookOpen />
                책 보기
              </Link>
            ) : (
              <form action={formAction}>
                <input type="hidden" name="year" value={row.year} />
                <MakeButton />
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 🔴 진한 버튼이었다. 내렸다.
 *
 *   화면의 진한 버튼은 **하나**여야 한다는 규칙을 세울 때 이 버튼은 하나였고,
 *   그래서 *"테두리로 분리된 구역의 주 행동"*이라는 예외를 줬다.
 *   그 뒤 시드가 넓어지면서 **연도가 넷이 됐고 이 버튼도 넷이 됐다.**
 *   홈 아래쪽에 검은 알약 네 개가 세로로 쌓이면 위의 [사진 등록]과 무게가 맞선다.
 *
 * 🔑 **강조는 개수에 반비례한다.** 넷이 다 진하면 어느 것도 두드러지지 않는다.
 *   발견성은 **구역이 담당한다** — 테두리와 `한 해가 한 권` 제목이 이미 그 일을 하고 있어서
 *   버튼이 그걸 또 할 필요가 없다.
 *
 * 🔑 조건이 바뀌면 예외도 다시 본다. 예외를 준 근거가 *"하나뿐이라서"*였기 때문이다.
 */
function MakeButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--ghost" disabled={pending}>
      <BookPlus />
      {pending ? "묶는 중…" : "책으로 묶기"}
    </button>
  );
}
