"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
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

export function NewArtworkForm({ today }: { today: string }) {
  const [state, formAction] = useActionState(createArtwork, INITIAL);

  const [preview, setPreview] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  // 오류가 나면 문제가 된 칸으로 초점을 옮긴다. 폼이 길어지면 오류 문구만으로는
  // 어디를 고쳐야 하는지 찾아야 하고, 폰에서는 그게 스크롤이다.
  useEffect(() => {
    if (state.field === "photo") photoRef.current?.focus();
    if (state.field === "madeOn") dateRef.current?.focus();
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
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="photo">
          사진 <span className="field__req">필수</span>
        </label>
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
          JPG · PNG · WebP, 8MB까지. 벽에 붙은 채로 찍어도 됩니다.
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

        {preview ? (
          <figure className="preview">
            {/* next/image는 원격 이미지 최적화가 목적이라 blob: URL에 쓸 자리가 아니다. */}
            <img className="preview__img" src={preview} alt="고른 사진 미리보기" />
            <figcaption className="preview__caption">
              이 사진이 맞나요?
              {size ? ` (${size.width}×${size.height})` : null}
            </figcaption>
          </figure>
        ) : null}

        {/* 상세 화면이 자리를 미리 잡는 데 쓴다. 없으면 서버가 그냥 버린다. */}
        <input type="hidden" name="width" value={size?.width ?? ""} />
        <input type="hidden" name="height" value={size?.height ?? ""} />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="childQuote">
          아이가 한 말
        </label>
        <textarea
          id="childQuote"
          name="childQuote"
          rows={3}
          className="field__input"
          defaultValue={state.values?.childQuote ?? ""}
          placeholder="이건 뭐야? 하고 물어보고, 대답을 그대로 적어보세요."
          aria-describedby="quote-help"
        />
        <p className="field__help" id="quote-help">
          {/*
            비워도 저장되게 만들었으면, 비워도 된다고 화면이 말해야 한다.
            말하지 않으면 사용자는 필수라고 가정하고 지어낸다. 지어낸 말은 이 서비스에 쓸모가 없다.
          */}
          지금 못 물어봤으면 비워두세요. 나중에 채울 수 있습니다.
        </p>
      </div>

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
          max={today}
          aria-describedby="date-help"
        />
        <p className="field__help" id="date-help">
          {/*
            사진 찍은 날이 아니라 만든 날이다. 벽에 붙어 있던 그림을 오늘 찍는 일이 흔하다.
            그래서 EXIF에서 자동으로 채우지 않는다. (docs/03-feasibility.md §3-2)
          */}
          오늘로 채워뒀습니다. 예전에 만든 것이면 바꿔주세요.
        </p>
      </div>

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
