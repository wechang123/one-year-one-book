"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Baby, SpeechQuote } from "./icons";

/**
 * 모든 화면 맨 위의 얇은 줄.
 *
 * 🔴 전에는 없었다. `layout.tsx`가 `<body>{children}</body>` 한 줄이었고,
 *   화면 사이를 옮기는 길이 전부 각 화면의 문장 속에 숨어 있었다 —
 *   `/child`는 아이 이름 글자에, `/recall`은 `남긴 것 12점 ·` 뒤에.
 *   화면이 하나였을 때는 그걸로 됐다. 지금은 열넷이다.
 *
 * 🔑 사이드바가 아니라 상단 바인 이유
 *   주 사용자가 폰 세로 한 손이다. 사이드바는 가로 폭을 상시로 먹고,
 *   375px에서는 접혀서 결국 햄버거 버튼 하나가 된다.
 *   **항목이 둘인데 여는 동작을 하나 더 만들 값이 없다.**
 *
 * 🔑 sticky가 아니다
 *   붙여두면 폰에서 세로 48px을 영구히 잃는다. 이 앱은 그림을 보는 앱이라 그 값이 비싸고,
 *   무엇보다 홈의 해 제목(`.span__head`)이 이미 `top: 0`에 붙는다.
 *   둘 다 붙이면 해 제목이 이 줄 뒤로 숨는다. **상단 자리는 하나뿐이고, 스크롤 중에
 *   더 필요한 쪽은 지금 어느 해를 보고 있는지다.** 이 줄은 올라가고 그 자리를 내준다.
 *
 * ⛔ DB를 읽지 않는다
 *   여기에 아이 이름을 넣으려면 `layout.tsx`가 프로필을 조회해야 하는데,
 *   그러면 **DB가 끊겼을 때 error.tsx조차 못 뜬다** — 오류 화면이 레이아웃 안에서 그려지기
 *   때문이다. 이 저장소는 DB를 끊고 한국어 오류 문구가 뜨는 것을 확인해뒀다(docs/worklog).
 *   그 검증을 지키기 위해 이 줄은 상수만 쓴다.
 */

const LINKS = [
  { href: "/recall", label: "되짚어보기", Icon: SpeechQuote },
  { href: "/child", label: "아이 정보", Icon: Baby },
];

export function SiteNav() {
  const here = usePathname();

  return (
    <nav className="sitenav" aria-label="주요 화면">
      <div className="sitenav__inner">
        {/*
          🔑 서비스 이름이 홈 링크다. 로고를 따로 그리지 않는다 —
            이름이 곧 이 서비스가 하는 일이라(`한 해가 한 권`) 그림보다 글자가 정확하다.
        */}
        <Link href="/" className="sitenav__home">
          한 해, 한 권
        </Link>

        <ul className="sitenav__list">
          {LINKS.map(({ href, label, Icon }) => (
            <li key={href}>
              {/*
                🔑 지금 보고 있는 화면은 `aria-current="page"`다.
                  색만으로 표시하면 그 사실이 화면을 못 보는 사람에게 도달하지 않는다.
                  CSS는 이 속성을 선택자로 쓴다 — 표시하는 근거가 한 곳에만 있게 된다.
              */}
              <Link
                href={href}
                className="sitenav__link"
                aria-current={here === href ? "page" : undefined}
              >
                <Icon />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
