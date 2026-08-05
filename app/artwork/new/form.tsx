"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { describeAge, type Birth } from "@/lib/age";
import { parseDateInputValue } from "@/lib/date";
import { QuoteField } from "../quote-field";
import { createArtwork, type NewArtworkState } from "./actions";

/**
 * 등록 폼.
 *
 * 🔑 왜 미리보기가 "있으면 좋은 것"이 아니라 필요한 것인가
 *   부모는 갤러리에서 비슷한 사진 여러 장 중 하나를 고른다. 잘못 골랐는지
 *   저장 전에 알 방법이 없으면, 알게 되는 시점이 상세 화면이고 그땐 이미 저장된 뒤다.
 *   그리고 편집 화면은 **사진 교체를 제공하지 않기로 했다**(#4).
 *   즉 이 화면에서 못 알아채면 되돌릴 방법이 없다. 그래서 고른 즉시 보여준다.
 *
 *   덤으로 원본 크기를 여기서 얻는다. 브라우저가 미리보기를 그리려고 이미 디코드했으므로
 *   naturalWidth/Height가 공짜로 나온다. 이 값을 같이 보내면 상세 화면이
 *   사진 도착 전에 자리를 잡을 수 있다(서버에서 재는 것은 이미지 라이브러리가 필요하다).
 */

const INITIAL: NewArtworkState = {};

/**
 * 서버의 MAX_BYTES(actions.ts)와 같은 값.
 *
 * 🔑 여기서 막는 것과 서버에서 막는 것은 목적이 다르다.
 *   서버 검사는 데이터를 지키고, 이 검사는 **시간을 지킨다** —
 *   폰 회선으로 10MB를 다 올려보낸 뒤에 "너무 큽니다"를 듣는 건 서버가 옳게 답한 것이지만
 *   사용자에겐 낭비다. 고른 즉시 아는 편이 낫다.
 *   그래도 서버 검사를 빼지 않는다. 이건 안내고, 저건 방어다.
 */
const MAX_BYTES = 8 * 1024 * 1024;

function formatMB(n: number): string {
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

export function NewArtworkForm({
  today,
  birth,
  lastQuoteBy,
}: {
  today: string;
  birth: Birth;
  /** 마지막으로 고른 말의 주인. 처음이면 아이. */
  lastQuoteBy: "CHILD" | "PARENT";
}) {
  const [state, formAction] = useActionState(createArtwork, INITIAL);

  const [preview, setPreview] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  /** 마지막으로 고른 파일. 서버가 거절하고 돌아왔을 때 입력칸에 되돌려 넣는다. */
  const pickedFile = useRef<File | null>(null);

  /**
   * 🔑 만든 날을 폼이 들고 있어야 하는 이유
   *   이 값이 **말의 주인과 시간 축을 같이 정한다.** 2018년 9월이면 임신 24주고
   *   그때는 아이가 말을 하지 않는다. 날짜를 고치면 그 두 가지가 그 자리에서 따라 바뀌어야
   *   사용자가 무엇을 남기고 있는지 안다.
   */
  const [madeOnValue, setMadeOnValue] = useState(state.values?.madeOn || today);
  useEffect(() => {
    if (state.values?.madeOn) setMadeOnValue(state.values.madeOn);
  }, [state]);

  const madeOn = parseDateInputValue(madeOnValue);
  const when = madeOn ? describeAge(madeOn, birth) : null;

  /**
   * 오류가 나면 ① 배너가 보이는 곳까지 스크롤하고 ② 문제가 된 칸에 초점을 준다.
   *
   * 🔴 초점만 옮겼었다. 저장 버튼은 폼 맨 아래, 배너는 맨 위라 **사진 누락 오류가
   *   화면 밖에서 조용히 떠 있었다** — 버튼이 무반응으로 읽혔다(직접 밟았다).
   *   날짜 오류에서만 동작해 보였던 이유: 날짜 칸이 마침 화면 안에 있었고,
   *   프로그램으로 준 초점은 :focus-visible 링을 안 그려서 파일 칸은 표시도 없었다.
   *   스크롤이 먼저다 — 초점은 키보드 사용자의 몫이고, 눈에는 배너가 답이다.
   */
  useEffect(() => {
    if (!state.error) return;
    errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (state.field === "photo") photoRef.current?.focus({ preventScroll: true });
    if (state.field === "madeOn") dateRef.current?.focus({ preventScroll: true });
  }, [state]);

  /**
   * 🔴 서버가 거절하고 돌아오면 React가 폼을 초기화해 **파일 입력만 비워졌다.**
   *   미리보기(클라이언트 상태)는 남아서 화면에는 사진이 붙어 있는 것처럼 보였고,
   *   날짜만 고쳐 다시 누르면 "사진을 골라주세요"가 떴다 — 30초 사용자에게 제일 비싼 실패다.
   *   브라우저는 파일 입력을 스크립트로 "채워달라"고 할 수는 없지만,
   *   **사용자가 이미 고른 File 객체를 DataTransfer로 되돌려 넣는 것**은 된다.
   *   화면이 보여주는 것(미리보기)과 실제로 제출될 것(input.files)을 다시 일치시킨다.
   */
  useEffect(() => {
    const input = photoRef.current;
    if (!state.error || !input || input.files?.length || !pickedFile.current) return;
    const restore = new DataTransfer();
    restore.items.add(pickedFile.current);
    input.files = restore.files;
  }, [state]);

  // 미리보기용 objectURL은 브라우저가 자동으로 놓아주지 않는다. 바꿀 때마다 직접 회수한다.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSize(null);
    setTooBig(null);
    pickedFile.current = file ?? null;

    if (!file) {
      setPreview(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      // 미리보기를 그리지 않는다. 올릴 수 없는 사진을 크게 보여주면 올라간 것처럼 읽힌다.
      setPreview(null);
      setTooBig(`${formatMB(file.size)}짜리 사진이라 올릴 수 없어요. ${formatMB(MAX_BYTES)}까지 됩니다.`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    const probe = new Image();
    probe.onload = () => setSize({ width: probe.naturalWidth, height: probe.naturalHeight });
    probe.src = url;
  }

  return (
    <form action={formAction} className="form" noValidate>
      {/*
        오류는 폼 맨 위에 둔다. 제출 버튼 옆에 두면 폰에서 키보드에 가린다.
        role="alert"이라 스크린리더가 즉시 읽는다.
      */}
      {state.error ? (
        <p ref={errorRef} className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="photo">
          사진 <span className="field__req">필수</span>
        </label>

        {/*
          🔴 **고르기 전에는 이 자리가 아무 말도 안 했다.** 파일 입력 한 칸과
            형식·크기 안내가 전부였다 — 무엇을 받는 곳인지도, 올리면 어떻게 보일지도
            말하지 않았다. 시드 이미지가 없는 상태(빈 DB)로 처음 여는 사람에게는
            이 화면이 서비스를 설명하는 **유일한 자리**인데 비어 있었던 것이다.

          🔑 갈림길: 문구만 / 크기 안내만 / **종횡비 틀 + 문구** → 셋째.
            문구만 두면 "어떻게 보일지"는 여전히 안 보이고,
            크기 안내는 이미 아래에 있으며 그건 **제약이지 설명이 아니다.**
            자리를 실제로 그려두면 고른 뒤 **같은 자리에 미리보기가 들어서면서**
            방금 읽은 말이 그 자리에서 증명된다.

          🔑 틀이 정사각인 이유는 목록 카드와 같은 비율이기 때문이다.
            여기서 본 자리가 목록에서도 같은 모양이라야 "이렇게 보이는구나"가 맞는 말이 된다.

          🔑 label이라 눌러도 파일 선택이 열린다. 아래 입력칸도 그대로 둔다 —
            틀은 설명이고, 입력칸은 키보드·JS 없는 경로에서도 동작해야 하는 진짜 컨트롤이다.
        */}
        {!preview ? (
          <label className="dropslot" htmlFor="photo">
            <span className="dropslot__title">여기에 사진이 들어갑니다</span>
            <span className="dropslot__body">
              그림, 만들기, 상장, 초음파 사진. <strong>손에 들려 있는 것이면 됩니다.</strong>
            </span>
            <span className="dropslot__body">원본 비율 그대로 보입니다. 잘리지 않아요.</span>
          </label>
        ) : (
          <figure className="preview">
            {/* next/image는 원격 이미지 최적화가 목적이라 blob: URL에 쓸 자리가 아니다. */}
            <img className="preview__img" src={preview} alt="고른 사진 미리보기" />
            <figcaption className="preview__caption">
              이 사진이 맞나요?
              {size ? ` (${size.width}×${size.height})` : null}
            </figcaption>
          </figure>
        )}

        <input
          ref={photoRef}
          id="photo"
          name="photo"
          type="file"
          /* 갤러리에서 이미지만 보이게 하는 안내. 검사는 서버가 바이트로 다시 한다. */
          accept="image/jpeg,image/png,image/webp"
          className="field__file"
          onChange={onPickPhoto}
          aria-describedby="photo-help"
        />
        <p className="field__help" id="photo-help">
          {/*
            🔴 `JPG · PNG · WebP`였다. 가운뎃점이 한 줄에 둘이었다.
              **띄어쓴 ` · `는 구분자**이고 구분자는 한 줄에 하나까지다.
              (붙여 쓴 `며칠·몇 개월`은 한국어 맞춤법의 가운뎃점이라 그대로 둔다 — 문장부호다.)
          */}
          JPG, PNG, WebP. 8MB까지. 벽에 붙은 채로 찍어도 됩니다.
        </p>

        {/*
          고른 즉시 알려주는 자리. 서버 오류(.form__error)와 생김새를 맞추되
          role="alert"로 즉시 읽히게 한다 — 제출을 기다리지 않고 지금 다시 고르면 되는 상황이다.
        */}
        {tooBig ? (
          <p className="form__error" role="alert">
            {tooBig}
          </p>
        ) : null}

        {/* 상세 화면이 자리를 미리 잡는 데 쓴다. 없으면 서버가 그냥 버린다. */}
        <input type="hidden" name="width" value={size?.width ?? ""} />
        <input type="hidden" name="height" value={size?.height ?? ""} />
      </div>

      {/*
        🔑 날짜가 말보다 위에 있다. 순서를 바꿨다.
          날짜가 **이 자리에 무엇을 적어야 하는지**를 정하기 때문이다 —
          태어나기 전이면 여기 남는 것은 부모의 말이고, 그 뒤면 아이의 말이다.
          말을 먼저 적게 해놓고 날짜를 나중에 물으면, 다 적고 나서 주인이 바뀐다.
      */}
      <div className="field">
        <label className="field__label" htmlFor="madeOn">
          만든 날 <span className="field__req">필수</span>
        </label>
        <input
          ref={dateRef}
          id="madeOn"
          name="madeOn"
          type="date"
          className="field__input field__input--date"
          defaultValue={state.values?.madeOn || today}
          onChange={(e) => setMadeOnValue(e.target.value)}
          max={today}
          aria-describedby="date-help"
        />
        <p className="field__help" id="date-help">
          {/*
            사진 찍은 날이 아니라 만든 날이다. 벽에 붙어 있던 그림을 오늘 찍는 일이 흔하다.
            그래서 EXIF에서 자동으로 채우지 않는다. (docs/03-feasibility.md §3-2)
          */}
          오늘로 채워뒀습니다. 예전 것이면 바꿔주세요. <strong>초음파 사진처럼 몇 해 전 것도 됩니다.</strong>
          {/*
            🔑 고른 날짜가 아이의 어느 시점이었는지 그 자리에서 말한다.
              날짜만으로는 "2018년 9월 12일"이 임신 몇 주였는지 부모도 바로 안 떠오른다.
              축이 보이면 연도를 잘못 친 것도 여기서 걸린다.
          */}
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
        madeOn={madeOn}
        defaultQuote={state.values?.childQuote ?? ""}
        defaultQuoteBy={lastQuoteBy}
      />

      <div className="form__actions">
        {/*
          🔑 올릴 수 없는 파일이면 제출 자체를 막는다.
            전에는 경고 문구만 띄우고 버튼은 살아 있었다. 20MB를 고른 사용자가 그대로 누르면
            요청 본문이 bodySizeLimit을 넘어 **서버 액션이 시작조차 못 하고**,
            그러면 앱이 준비한 한국어 안내 대신 빈 오류가 뜬다.
            서버 검사는 그대로 둔다 — 이건 안내고 저건 방어다.
        */}
        <SubmitButton blocked={!!tooBig} />
        <a href="/" className="btn btn--ghost">
          그만두기
        </a>
      </div>
    </form>
  );
}

/**
 * 제출 중 표시.
 *
 * 🔑 이 서비스에서 로딩 표시가 특히 필요한 이유
 *   올리는 것이 수 MB짜리 사진이라 폰 회선에서는 몇 초가 걸린다.
 *   버튼이 그대로면 사용자는 안 눌렸다고 보고 다시 누른다. 그러면 같은 작품이 두 번 등록된다.
 *   disabled가 그 두 번째 클릭을 막고, 문구가 지금 뭐가 일어나는지 말한다.
 */
function SubmitButton({ blocked }: { blocked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending || blocked}>
      {pending ? "저장하는 중…" : "저장하기"}
    </button>
  );
}
