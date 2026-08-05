import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft as LArrowLeft,
  ArrowRight as LArrowRight,
  Baby as LBaby,
  BookOpen as LBookOpen,
  BookPlus as LBookPlus,
  CalendarDays as LCalendarDays,
  Camera as LCamera,
  LayoutGrid as LLayoutGrid,
  Milestone as LMilestone,
  MessageSquareQuote as LMessageSquareQuote,
  Package as LPackage,
  PanelLeftClose as LPanelLeftClose,
  PanelLeftOpen as LPanelLeftOpen,
  RotateCcw as LRotateCcw,
  Search as LSearch,
  SquarePen as LSquarePen,
} from "lucide-react";

/**
 * 아이콘 — [Lucide](https://github.com/lucide-icons/lucide) (ISC).
 * 라이선스 전문은 `licenses/lucide-ISC.txt`. ISC가 고지를 모든 사본에 남길 것을 요구한다.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 전에는 `path`를 **손으로 옮겨 적었다.** 근거가 두 개였는데 하나가 순환이었다.
 *
 *   ① 런타임 의존성이 4개에서 5개가 된다 — 맞는 말이지만 값을 안 재고 썼다.
 *      `.next/static/chunks`의 JS 합계를 전후로 재보니 **654KB → 657KB**다.
 *      아이콘 열한 개에 **3KB**. 트리셰이킹이 되는 패키지라 안 쓰는 6,003개는 안 실린다.
 *   ② *"쓰는 것이 여섯 개뿐이라 1,500개짜리를 들여올 압력이 없다"* — **이게 순환이었다.**
 *      손으로 옮겨야 하니까 적게 썼고, 적게 쓰니까 패키지가 필요 없다고 결론지었다.
 *
 * 🔑 패키지의 값은 여섯 개를 대신 넣어주는 데 있지 않다.
 *   **아이콘을 바꾸고 더하는 값이 0에 가까워지는 것**이 값이다.
 *   실제로 이 파일이 패키지로 바뀌자마자 은유 하나를 고치고(책 만들기 ≠ 책 보기)
 *   네 자리에 아이콘을 새로 붙였다. 손으로 옮기던 동안에는 **둘 다 안 했다.**
 *
 * ─────────────────────────────────────────────────────────────
 * 🔑 어디에 붙이는가 — 규칙 하나
 *
 *   **"어디로 가는가"와 "무엇에 대한 것인가"에만 붙인다. "무엇을 하는가"에는 안 붙인다.**
 *
 *     어디로      뒤로 · 다음 단계 · 상단 바
 *     무엇에 대해  사진 · 책 · 아이 · 말 · 주문 · 고치기
 *     안 붙임      저장하기 · 그만두기 · 다시 시도 · 전체 보기 · 한 장씩 보기
 *
 *   안 붙이는 쪽은 **자리와 색이 이미 무게를 말한다.** 폼 맨 아래 진한 버튼이 저장이라는 것은
 *   아이콘 없이도 안다. 전부에 붙이면 **아이콘이 더는 무게를 못 만든다.**
 *
 *   ⚠️ [찾기]만 예외다. 폼 제출 버튼이지만 검색 이름표를 자리표시자로 내려서
 *     **이 폼이 검색이라는 것을 말하는 유일한 표시**가 그 아이콘이다.
 *
 * 🔑 전부 `aria-hidden`이다. 옆에 늘 글자가 있고, **글자 없는 아이콘 버튼을 만들지 않는다.**
 *   뜻을 아이콘에만 실으면 그 뜻은 보이지 않는 사람에게 도달하지 않는다.
 *
 * 🔑 크기는 CSS가 `em`으로 정한다(globals.css `.icon`). 글자 옆에 서는 것이라
 *   글자 크기를 따라가야 줄이 흐트러지지 않는다.
 */

/**
 * 🔑 `strokeWidth`가 2.25다. Lucide 기본값은 2인데, 그건 24px에 그릴 때의 값이다.
 *   이 앱은 아이콘을 **14px 글자 옆 16px**에 그린다 — 기본값이면 획이 1.33px이라
 *   옆의 굵은 글자(600)보다 가늘어 보인다. 실제로 렌더해서 맞췄다.
 */
function wrap(Glyph: LucideIcon, name: string) {
  const Icon = () => <Glyph className="icon" strokeWidth={2.25} aria-hidden focusable="false" />;
  Icon.displayName = name;
  return Icon;
}

/** 뒤로. 화면 11곳의 되돌아가는 링크. */
export const ArrowLeft = wrap(LArrowLeft, "ArrowLeft");

/** 다음 단계로. 주문 상태를 앞으로 미는 버튼. */
export const ArrowRight = wrap(LArrowRight, "ArrowRight");

/** 아이 정보 — 이름·예정일·태어난 날을 넣는 자리. */
export const Baby = wrap(LBaby, "Baby");

/**
 * 사진 등록.
 * 🔑 `Plus`가 아니라 `Camera`다. 더하기는 *"항목을 하나 만든다"*는 말이고,
 *   이 서비스에서 실제로 하는 일은 **손에 들려 있는 것을 찍는 것**이다.
 */
export const Camera = wrap(LCamera, "Camera");

/**
 * 찾기.
 * ⚠️ 유일한 폼 제출 아이콘이다. 이름표를 자리표시자로 내려서
 *   이 폼이 검색이라는 것을 말하는 표시가 이것뿐이다.
 */
export const Search = wrap(LSearch, "Search");

/** 책 보기 — 이미 있는 책을 여는 자리. */
export const BookOpen = wrap(LBookOpen, "BookOpen");

/**
 * 책으로 묶기.
 * 🔴 전에는 [책 보기]와 **같은 아이콘**이었다. 한 해에 둘 중 하나만 뜨니까 헷갈릴 일이
 *   없다고 넘겼는데, 그건 *"구별이 필요 없다"*가 아니라 *"구별을 안 해도 안 들킨다"*였다.
 *   **없는 것을 만드는 행동**과 **있는 것을 여는 행동**은 다른 일이다.
 */
export const BookPlus = wrap(LBookPlus, "BookPlus");

/**
 * 되짚어보기 — 사진을 빼고 아이 말만 남기는 화면.
 * 🔴 처음에 `Quote`(따옴표 두 개)를 넣었다가 바꿨다. 14px로 렌더해 보니
 *   **`))` 두 글자로 읽혔다.** 따옴표는 글자 옆에 있을 때 따옴표지 혼자 서면 곡선 두 개다.
 */
export const SpeechQuote = wrap(LMessageSquareQuote, "SpeechQuote");

/**
 * 주문.
 * 🔑 `Truck`이 아니라 `Package`다. 배송사 연동이 없어서 **배송 상태를 만들지 않았는데**
 *   트럭을 그리면 화면이 앱이 안 하는 일을 약속한다. 받는 것은 상자 하나다.
 */
export const Package = wrap(LPackage, "Package");

/** 고치기 — 말·날짜·표지 제목을 나중에 채우거나 바로잡는 자리. */
export const SquarePen = wrap(LSquarePen, "SquarePen");

/** 처음 상태로 되돌리기. 데모를 마음껏 망가뜨릴 수 있게 하는 자리. */
export const RotateCcw = wrap(LRotateCcw, "RotateCcw");

/* ── v2의 사이드바가 쓰는 넷 ───────────────────────────── */

/**
 * 타임라인.
 * 🔑 `Route`(구불구불한 길)가 아니라 `Milestone`(이정표)이다.
 *   이 앱의 타임라인은 **지나온 자리에 표가 하나씩 꽂혀 있는 것**이지
 *   어디로 가는 길이 아니다. 앞으로 갈 곳을 그리면 화면이 목표를 만든다.
 */
export const Milestone = wrap(LMilestone, "Milestone");

/** 캘린더. */
export const CalendarDays = wrap(LCalendarDays, "CalendarDays");

/** 모아보기 — v1의 격자 화면. */
export const LayoutGrid = wrap(LLayoutGrid, "LayoutGrid");

/* 사이드바 접기/펴기. "어디로"의 변형이다 — 메뉴 자체가 어디 있는지를 다룬다. */
export const PanelLeftClose = wrap(LPanelLeftClose, "PanelLeftClose");
export const PanelLeftOpen = wrap(LPanelLeftOpen, "PanelLeftOpen");
