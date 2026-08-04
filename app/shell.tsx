"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Baby,
  BookOpen,
  CalendarDays,
  Camera,
  LayoutGrid,
  Milestone,
  SpeechQuote,
} from "./icons";

/**
 * v2의 뼈대 — 데스크탑은 사이드바, 폰은 하단 탭.
 *
 * ═══════════════════════════════════════════════════════════
 * 🔴 v1에는 상단 바 하나뿐이었고 링크가 둘이었다. 그걸로 충분했던 이유는
 *   **화면이 하나(목록)였기 때문**이다. 나머지는 전부 그 목록에 딸린 것이었다.
 *
 *   v2는 같은 기록을 **네 가지 방식으로 본다** — 시간축(타임라인) · 달력 · 격자 · 말.
 *   넷 중 어느 것도 나머지에 딸려 있지 않다. **나란한 것이 넷이면 나란히 놓는 자리가 필요하다.**
 *   그 자리가 사이드바다.
 *
 * 🔑 왜 이제는 사이드바인가 — v1에서 거절했던 이유가 사라졌다
 *   그때 근거는 *"항목이 둘인데 여는 동작을 하나 더 만들 값이 없다"*였다. 지금은 다섯이고,
 *   **폰에서는 여는 동작을 안 만든다** — 사이드바가 하단 탭으로 바뀐다.
 *   접었다 펴는 햄버거는 여전히 안 만든다.
 *
 * 🔑 간격은 DESIGNNAS의 실무 스페이싱 가이드를 따랐다(docs/v2/spacing.md).
 *   탭 내부 상하 16px, 탭 사이 12px, 화면 좌우 24px.
 */

type Item = { href: string; label: string; Icon: () => React.ReactElement; exact?: boolean };

/**
 * 🔑 다섯 칸의 순서가 곧 이 서비스의 주장이다.
 *   **시간축이 첫째다** — 이 앱이 다루는 것이 8~9년이고, 그 8~9년을 한 줄로 보는 것이
 *   나머지 셋(달력·격자·말)이 잘라 보는 것보다 앞선다.
 */
const NAV: Item[] = [
  { href: "/", label: "타임라인", Icon: Milestone, exact: true },
  { href: "/calendar", label: "캘린더", Icon: CalendarDays },
  { href: "/grid", label: "모아보기", Icon: LayoutGrid },
  { href: "/recall", label: "되짚어보기", Icon: SpeechQuote },
  { href: "/books", label: "책", Icon: BookOpen },
];

function isHere(pathname: string, item: Item): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function Shell({ owner }: { owner: string | null }) {
  const pathname = usePathname();

  return (
    <>
      {/* ── 데스크탑: 왼쪽에 상시로 서 있다 ───────────────────── */}
      <nav className="side" aria-label="주요 화면">
        <Link href="/" className="side__brand">
          한 해, 한 권
        </Link>

        {/*
          🔑 등록이 메뉴 위에 있고 혼자 진한 색이다.
            메뉴는 **보는 곳**이고 등록은 **남기는 일**이라 같은 목록에 섞지 않는다.
            v1에서 지킨 "화면의 진한 버튼은 하나"가 여기서도 그대로다.
        */}
        <Link href="/artwork/new" className="btn side__new">
          <Camera />
          사진 등록
        </Link>

        <ul className="side__list">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="side__link"
                aria-current={isHere(pathname, item) ? "page" : undefined}
              >
                <item.Icon />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/*
          🔑 아이 정보는 맨 아래다. **한 번 넣고 다시 안 여는 값**이라
            매일 쓰는 다섯 칸과 같은 무게로 두면 그만큼 흐려진다.
            이름이 있으면 이름을 부른다 — 이 앱이 누구의 기록인지가 거기서 드러난다.
        */}
        <Link
          href="/child"
          className="side__child"
          aria-current={pathname.startsWith("/child") ? "page" : undefined}
        >
          <Baby />
          {owner ? `${owner}의 기록` : "아이 정보"}
        </Link>
      </nav>

      {/* ── 폰: 아래에 붙는다 ───────────────────────────────── */}
      <nav className="tabbar" aria-label="주요 화면">
        <ul className="tabbar__list">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="tabbar__link"
                aria-current={isHere(pathname, item) ? "page" : undefined}
              >
                <item.Icon />
                <span className="tabbar__label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/*
        🔑 폰에서 등록은 탭 바 위에 뜬다.
          탭 다섯 칸에 여섯째로 끼워 넣지 않는 이유: **등록은 보는 일이 아니다.**
          탭에 섞으면 "지금 어느 화면인가"를 말하는 줄에 "무엇을 해라"가 끼어든다.
      */}
      <Link href="/artwork/new" className="btn fab">
        <Camera />
        사진 등록
      </Link>
    </>
  );
}
