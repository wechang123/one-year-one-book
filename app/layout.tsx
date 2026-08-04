import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteNav } from "./site-nav";

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
    <html lang="ko">
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
