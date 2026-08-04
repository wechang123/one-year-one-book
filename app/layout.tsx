import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteNav } from "./site-nav";

/**
 * 본문 글꼴 — Pretendard(SIL OFL), 이 앱이 쓰는 만큼만 잘라낸 309KB.
 *
 * 🔴 한 번 접었다가 다시 폈다. 접은 근거가 *"원본이 2,009KB"*였는데,
 *   같은 문장에서 *"1.7MB를 비싸다고 해놓고 2MB를 글꼴로 얹으면 앞뒤가 안 맞는다"*고 썼다.
 *   **1.7MB는 매 요청이고 글꼴은 한 번 받고 캐시된다.** 비교할 수 없는 둘을 나란히 놨던 것이다.
 *   서브셋하면 309KB다 — 이 저장소가 이미 싣고 있는 시드 이미지(334KB)보다 작다.
 *   자르는 코드는 `scripts/subset-font.mjs`에 있고 무엇이 들어갔는지 거기 적혀 있다.
 *
 * 🔑 왜 시스템 글꼴로 두지 않았나
 *   macOS는 Apple SD Gothic Neo, Windows는 맑은 고딕이라 **보는 사람마다 다른 화면**이었다.
 *   이 저장소는 1440px에서 몇 px인지를 재서 문서에 적어왔는데, 그 값들이
 *   **재는 사람의 OS에 달려 있었다.** 글꼴을 고정해야 그 수가 재현된다.
 *
 * 🔑 `display: "swap"`
 *   309KB를 받는 동안 글자가 안 보이면 안 된다. 시스템 글꼴로 먼저 읽히고 나중에 바뀐다.
 *   이 앱은 **읽는 화면**이라, 늦게 예뻐지는 쪽이 일찍 비어 있는 쪽보다 낫다.
 *
 * 🔑 `adjustFontFallback: false`
 *   Next가 대체 글꼴의 자간을 자동으로 맞춰주는 기능은 라틴 문자 지표를 기준으로 한다.
 *   한글에 걸면 오히려 어긋난다.
 */
const pretendard = localFont({
  src: "./fonts/pretendard-subset.woff2",
  // 가변 글꼴이라 한 파일이 이 범위를 다 덮는다. 앱이 쓰는 굵기가 400·500·600·700이다.
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-sans",
  adjustFontFallback: false,
});

const DESCRIPTION =
  "아이가 남긴 것을 그때의 말과 함께 받아두고, 한 해가 지나면 한 권으로 묶습니다. 그래서 실물을 마음 편히 정리할 수 있게 합니다.";

export const metadata: Metadata = {
  title: "한 해, 한 권",
  description: DESCRIPTION,
  /*
   * 🔑 `openGraph`에 이미지도 URL도 넣지 않았다.
   *   이 앱은 배포 주소가 정해져 있지 않다 — `docker compose up`으로 아무 데서나 뜬다.
   *   `metadataBase`에 그럴듯한 도메인을 지어 넣으면 **저장소에 없는 사실이 하나 생긴다.**
   *   제목·설명·언어는 주소를 몰라도 참이라 그것만 적는다.
   */
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "한 해, 한 권",
    title: "한 해, 한 권",
    description: DESCRIPTION,
  },
};

// 주 사용자는 폰 세로, 심사자는 노트북 가로다. 둘 다 기준으로 둔다.
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        {/*
          🔑 건너뛰기 링크. 상단 바가 생기면서 키보드 사용자는 **매 화면마다** 링크 셋을
            지나야 본문에 닿게 됐다. 평소에는 화면 밖에 있다가 탭으로 포커스가 오면 나타난다.
            링크 셋이 적어 보여도 화면이 열넷이라 그만큼 반복된다.
        */}
        <a href="#main" className="skip">
          본문으로 건너뛰기
        </a>

        {/*
          🔑 상단 바가 모든 화면에 있다. 오류 화면(error.tsx)과 없는 주소(not-found.tsx)도
            레이아웃 안에서 그려지므로, **막힌 자리에서 나갈 길이 늘 하나는 있다.**
        */}
        <SiteNav />

        {/*
          🔴 `<main>`이 저장소에 **한 곳도 없었다.** 화면 열넷이 전부 `<div>`로 시작했다.
            보조기술은 이 표시로 "여기부터가 이 화면의 본문"을 안다. 위 건너뛰기 링크도
            도착할 자리가 있어야 성립한다.
        */}
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
