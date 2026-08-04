"use client";

import { useState } from "react";
import { couldHaveSpoken, type Birth } from "@/lib/age";

/**
 * "그때의 말" 입력칸 — 등록과 편집이 같은 것을 쓴다.
 *
 * 🔴 이 칸은 원래 `아이가 한 말` 하나였다. 그리고 그 옆에
 *   *"어른의 말은 안 받는다"*는 규칙이 붙어 있었다.
 *   **그 규칙은 아이가 말을 할 수 있을 때의 판단이었다.**
 *   초음파 사진부터 받게 되면 임신 구간에는 아이 말이 존재하지 않고,
 *   말을 안 받으면 *"복원할 수 없는 것은 말이다"*라는 이 서비스의 주장이
 *   그 구간에서 통째로 비어버린다.
 *
 *   그래서 금지를 푸는 대신 **누구의 말인지를 같이 받는다.**
 *   부모의 말은 부모의 말로 남는다 — 원래 막으려던 것(어른의 해석이 아이 말로 둔갑하는 것)은
 *   그대로 막히고, 비어 있던 시기가 채워진다.
 *
 * 🔑 태어나기 전이면 **고르게 하지 않는다.** 그건 앱이 아는 사실이다.
 *   반대로 태어난 뒤에 *"이 아이가 말을 하는가"*는 **앱이 모른다** —
 *   시작하는 때가 아이마다 다르고, 앱이 정하면 그게 곧 발달 판정이다.
 *   그래서 그 뒤로는 고르게 하고, **기본값을 마지막에 고른 값으로 둔다.**
 *   부모는 알기 때문에 한 번만 고르면 된다.
 */
export function QuoteField({
  birth,
  madeOn,
  defaultQuote,
  defaultQuoteBy,
  rows = 3,
  fieldId = "childQuote",
}: {
  birth: Birth;
  /** 지금 폼에 들어 있는 만든 날. 날짜를 바꾸면 이 칸이 같이 바뀐다. */
  madeOn: Date | null;
  defaultQuote: string;
  defaultQuoteBy: "CHILD" | "PARENT";
  rows?: number;
  fieldId?: string;
}) {
  const spoken = madeOn ? couldHaveSpoken(madeOn, birth) : true;
  const [picked, setPicked] = useState<"CHILD" | "PARENT">(defaultQuoteBy);

  // 태어나기 전이면 고를 것이 없다. 태아는 말을 하지 않는다.
  const by = spoken ? picked : "PARENT";
  const helpId = `${fieldId}-help`;

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        그때의 말
      </label>

      {spoken ? (
        <fieldset className="speaker">
          <legend className="speaker__legend">누구의 말인가요</legend>
          <label className="speaker__opt">
            <input
              type="radio"
              name="quoteBy"
              value="CHILD"
              checked={by === "CHILD"}
              onChange={() => setPicked("CHILD")}
            />
            아이가 한 말
          </label>
          <label className="speaker__opt">
            <input
              type="radio"
              name="quoteBy"
              value="PARENT"
              checked={by === "PARENT"}
              onChange={() => setPicked("PARENT")}
            />
            내가 남긴 말
          </label>
        </fieldset>
      ) : (
        <>
          {/* 고를 수 없는 값은 숨은 칸으로 보낸다. 서버도 날짜를 보고 같은 판단을 다시 한다. */}
          <input type="hidden" name="quoteBy" value="PARENT" />
          <p className="speaker__fixed">
            아직 태어나기 전입니다. 이 자리에 남는 것은 <strong>부모의 말</strong>입니다.
          </p>
        </>
      )}

      <textarea
        id={fieldId}
        name="childQuote"
        rows={rows}
        className="field__input"
        defaultValue={defaultQuote}
        placeholder={
          by === "CHILD"
            ? "아이가 한 말을 그대로 적어주세요"
            : "지금 본 것, 지금 하고 싶은 말을 그대로 적어주세요"
        }
        aria-describedby={helpId}
      />

      <p className="field__help" id={helpId}>
        {by === "CHILD" ? (
          <>
            {/*
              🔑 이 문구가 콘텐츠 품질을 앱이 통제하는 **유일한 지점**이다.
                전에는 "이건 뭐야?"를 제안했는데, 그 질문의 답은 이름 하나다 — "닭."
                그림만 보면 모를 문장들은 **전부** "왜 그랬는지"에서 나온 말이었다.
                앱이 시키는 질문과 앱이 자랑하는 문장이 다른 질문에서 나오고 있었다.
            */}
            <strong>&ldquo;이거 무슨 얘기야?&rdquo;</strong> 하고 물어보면 이야기가 나옵니다.
            &ldquo;이건 뭐야?&rdquo;라고 물으면 &ldquo;닭.&rdquo; 하고 끝납니다.
          </>
        ) : (
          <>
            아이가 아직 말을 안 하는 시기에 남는 것은 <strong>부모가 그 자리에서 한 말</strong>입니다.
            태담도, 그날 처음 본 것도 여기 남습니다.
          </>
        )}
        <br />
        지금 못 적었으면 비워두세요. 나중에 채울 수 있습니다.
      </p>
    </div>
  );
}
