"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { couldHaveSpoken, type Birth } from "@/lib/age";
import { letterTiming } from "@/lib/letter";
import { parseDateInputValue } from "@/lib/date";
import { addLetter, updateLetter, type LetterState } from "./letter-actions";

const INITIAL: LetterState = {};

/**
 * 편지 폼 — 더하기와 고치기가 같은 몸을 쓴다.
 *
 * 🔑 쓴 날이 폼의 축이다. 날짜를 바꾸면 두 가지가 따라 바뀐다 —
 *   ① 말의 주인 선택지(태어나기 전이면 부모로 고정: 태아는 말을 하지 않는다)
 *   ② 간격 안내("만든 날에서 7년 3개월 뒤") — 저장하기 전에 화면이 미리 말해준다.
 *
 * 🔑 기본 쓴 날이 **오늘**이다. 이 폼이 열리는 전형적인 순간이
 *   "옛 기록을 보다가 지금 다시 물어봤다/지금 하고 싶은 말이 생겼다"라서다.
 *   그때 받은 말은 등록 폼이 이미 받았다(쓴 날 = 만든 날).
 */
export function LetterForm({
  mode,
  artworkId,
  letterId,
  madeOn,
  birth,
  today,
  defaultBody = "",
  defaultBy,
  defaultWrittenOn,
}: {
  mode: "add" | "edit";
  artworkId: string;
  letterId?: string;
  /** "2019-04-22" — 간격 안내의 기준. */
  madeOn: string;
  birth: Birth;
  today: string;
  defaultBody?: string;
  defaultBy: "CHILD" | "PARENT";
  defaultWrittenOn: string;
}) {
  const [state, formAction] = useActionState(mode === "add" ? addLetter : updateLetter, INITIAL);
  const [writtenOnValue, setWrittenOnValue] = useState(state.values?.writtenOn ?? defaultWrittenOn);
  const [picked, setPicked] = useState<"CHILD" | "PARENT">(state.values?.writtenBy ?? defaultBy);

  const writtenOn = parseDateInputValue(writtenOnValue);
  const madeOnDate = parseDateInputValue(madeOn);
  const spoken = writtenOn ? couldHaveSpoken(writtenOn, birth) : true;
  const by = spoken ? picked : "PARENT";
  const timing = writtenOn && madeOnDate ? letterTiming(madeOnDate, writtenOn) : null;

  return (
    <form action={formAction} className="form letterform" noValidate>
      {mode === "add" ? (
        <input type="hidden" name="artworkId" value={artworkId} />
      ) : (
        <input type="hidden" name="letterId" value={letterId} />
      )}

      {state.error ? (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor={`writtenOn-${mode}`}>
          쓴 날
        </label>
        <input
          id={`writtenOn-${mode}`}
          name="writtenOn"
          type="date"
          className="field__input field__input--date"
          value={writtenOnValue}
          onChange={(e) => setWrittenOnValue(e.target.value)}
          max={today}
          aria-describedby={`writtenOn-help-${mode}`}
        />
        <p className="field__help" id={`writtenOn-help-${mode}`}>
          {/* 간격을 저장 전에 미리 말한다. 이 간격이 편지 테이블을 만든 값이다. */}
          {timing ? (
            <>
              만든 날에서 <strong>{timing}</strong> 쓴 편지로 남습니다.
            </>
          ) : (
            <>만든 날과 같은 날입니다 — 그때의 말로 남습니다.</>
          )}
        </p>
      </div>

      {spoken ? (
        <fieldset className="speaker">
          <legend className="speaker__legend">누구의 말인가요</legend>
          <label className="speaker__opt">
            <input
              type="radio"
              name="writtenBy"
              value="CHILD"
              checked={by === "CHILD"}
              onChange={() => setPicked("CHILD")}
            />
            아이가 한 말
          </label>
          <label className="speaker__opt">
            <input
              type="radio"
              name="writtenBy"
              value="PARENT"
              checked={by === "PARENT"}
              onChange={() => setPicked("PARENT")}
            />
            내가 남긴 말
          </label>
        </fieldset>
      ) : (
        <>
          {/* 고를 수 없는 값은 숨은 칸으로. 서버도 쓴 날을 보고 같은 판단을 다시 한다. */}
          <input type="hidden" name="writtenBy" value="PARENT" />
          <p className="speaker__fixed">
            그날은 아직 태어나기 전입니다. 이 편지는 <strong>부모의 말</strong>로 남습니다.
          </p>
        </>
      )}

      <div className="field">
        <label className="field__label" htmlFor={`body-${mode}`}>
          편지
        </label>
        <textarea
          id={`body-${mode}`}
          name="body"
          rows={3}
          className="field__input"
          defaultValue={state.values?.body ?? defaultBody}
          placeholder={
            by === "CHILD"
              ? "다시 물어보고 나온 말을 그대로 적어주세요"
              : "지금 이 기록을 보며 하고 싶은 말을 적어주세요"
          }
        />
      </div>

      <div className="form__actions">
        <SubmitButton mode={mode} />
        {mode === "edit" ? (
          <Link href={`/artwork/${artworkId}`} className="btn btn--ghost">
            그만두기
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function SubmitButton({ mode }: { mode: "add" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "저장하는 중…" : mode === "add" ? "편지 남기기" : "저장하기"}
    </button>
  );
}
