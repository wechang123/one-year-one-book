/**
 * 아이콘 — Lucide에서 **쓰는 것만** 베껴 왔다.
 *
 * 출처: https://github.com/lucide-icons/lucide (ISC) · 전문은 `licenses/lucide-ISC.txt`
 *   ISC는 "저작권 고지와 허가 고지를 모든 사본에 남길 것"을 요구한다. 그래서 파일을 동봉했다.
 *
 * 🔴 iconsax를 조사했고 채택하지 않았다
 *   iconsax의 아이콘 그림은 *"다른 이름으로 재배포 금지, 템플릿·UI킷 사용은 허가 필요"*로
 *   공지돼 있는데, **라이선스 전문을 확인하지 못했다** — docs.iconsax.io/license가
 *   본문을 스크립트로 그려서 받아지지 않았다. npm `iconsax-react`가 가리키는 저장소
 *   (premier213/iconsax-react)는 `GET /repos/…/license`가 **404**다. 라이선스 파일이 없다.
 *   이 저장소는 공개고, `docs/03-feasibility.md`를 출처·라이선스 판정의 정본으로 두고
 *   시드 사진 한 장까지 따졌다. **그 기준을 아이콘에서만 낮출 수 없다.**
 *   Lucide(ISC)·Phosphor(MIT)는 저장소의 LICENSE 파일을 직접 받아 확인했다.
 *
 * 🔑 패키지를 안 깔고 인라인한 이유
 *   `lucide-react`를 넣으면 런타임 의존성이 4개에서 5개가 된다. 지금 쓰는 아이콘은 다섯이고,
 *   1,500개짜리 묶음을 들여올 재사용 압력이 아직 없다 — README가 Tailwind를 거절할 때 쓴
 *   그 논거가 여기에도 그대로 적용된다. **여기 있는 path는 전부 눈으로 읽고 넣은 것이다.**
 *   쓰는 아이콘이 열댓 개를 넘고 손으로 옮기는 것이 실수의 원인이 되면 그때 패키지를 넣는다.
 *
 * 🔑 전부 `aria-hidden`이다
 *   이 저장소는 **글자 없는 아이콘 버튼을 만들지 않는다.** 아이콘 옆에는 늘 말이 있고,
 *   그러면 아이콘까지 읽히는 것은 같은 말을 두 번 읽는 것이다.
 *   뜻을 아이콘에만 실으면 그 뜻은 보이지 않는 사람에게 도달하지 않는다.
 *
 * 🔑 크기가 `em`이다
 *   글자 옆에 서는 것이라 글자 크기를 따라가야 줄이 흐트러지지 않는다(globals.css `.icon`).
 */

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/**
 * 되짚어보기 — 사진을 빼고 아이 말만 남기는 화면.
 *
 * 🔴 처음에 lucide `quote`(따옴표 두 개)를 넣었다가 바꿨다.
 *   14px에서 실제로 렌더해 보니 **`))` 두 글자로 읽혔다.** 따옴표는 글자 옆에 있을 때
 *   따옴표지, 혼자 서면 그냥 곡선 두 개다. 말풍선은 그 크기에서도 말풍선이다.
 */
export function SpeechQuote() {
  return (
    <Glyph>
      <path d="M14 14a2 2 0 0 0 2-2V8h-2" />
      <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
      <path d="M8 14a2 2 0 0 0 2-2V8H8" />
    </Glyph>
  );
}

/** 아이 정보 — 이름·예정일·태어난 날을 넣는 자리. */
export function Baby() {
  return (
    <Glyph>
      <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
      <path d="M15 12h.01" />
      <path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
      <path d="M9 12h.01" />
    </Glyph>
  );
}

/**
 * 사진 등록.
 *
 * 🔑 `plus`가 아니라 `camera`다. 더하기는 "항목을 하나 만든다"는 말이고,
 *   이 서비스에서 실제로 하는 일은 **손에 들려 있는 것을 찍는 것**이다.
 */
export function Camera() {
  return (
    <Glyph>
      <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
      <circle cx="12" cy="13" r="3" />
    </Glyph>
  );
}

/** 찾기. */
export function Search() {
  return (
    <Glyph>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </Glyph>
  );
}

/** 책. */
export function BookOpen() {
  return (
    <Glyph>
      <path d="M12 5v16" />
      <path d="M20.001 19A2 2 0 0 0 22 17V5a2 2 0 0 0-1.999-2L16 3.002A5 5 0 0 0 12 5a5 5 0 0 0-4-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 1.999 2H8a5 5 0 0 1 4 2 5 5 0 0 1 4-2z" />
    </Glyph>
  );
}
