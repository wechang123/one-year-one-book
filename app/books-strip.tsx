"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createBook, type BookActionState } from "./book/actions";

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
 * 🔑 이게 왜 홈에 있나
 *   이 서비스에서 책은 부가 기능이 아니라 목적이다. 화면 속 데이터로는 실물을 버릴 결심이 안 선다.
 *   그런데 책 만들기를 별도 메뉴 뒤에 숨기면 "언젠가 하는 일"이 되고, 그러면 이 서비스의
 *   목적이 화면에서 사라진다. 등록만 계속하는 아카이브가 된다.
 *
 * 🔑 등록 버튼보다 아래에 둔다
 *   주 사용자가 여는 이유는 여전히 "아이가 방금 그림을 내밀어서"다. 그게 30초짜리 일이고,
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

function MakeButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "묶는 중…" : "책으로 묶기"}
    </button>
  );
}
