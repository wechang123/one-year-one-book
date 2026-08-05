import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "./shell";
import { getOwnerName } from "@/lib/owner";

/**
 * 🔴 여기 `next/font/local` 두 벌(Pretendard 309KB + Gowun Batang 200KB)이 있었다.
 *   걷어냈다 — **웹폰트를 받지 않는다. 다운로드 0바이트, 외부 요청 0건.**
 *
 *   반전의 근거는 실측이다: `font-family: serif`가 한글에서 **실제 명조로 해상된다**
 *   (serif → AppleMyungjo 폭 311.7px, sans-serif → 263.2px로 갈라짐을 쟀다).
 *   명조 목소리가 공짜로 있는데 200KB를 실어 나르고 있었던 것이다.
 *   단, "Noto Serif KR"처럼 **이름으로 부르면 폴백된다**(263.2) — 그래서 generic만 쓴다.
 *
 *   접는 대가도 적어둔다: ① 플랫폼마다 다른 명조/고딕이 나온다 — 문서의 px 실측이
 *   재는 사람의 OS에 얹힌다. 그건 받아들인다. ② 두 벌을 자르던 코드
 *   (`scripts/subset-font.mjs`)와 그 안의 KS X 1001 판별 로직도 같이 나갔다 —
 *   배운 것은 결정 기록에 남고, 안 쓰는 코드는 저장소에 남지 않는다.
 */

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwnerName();

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
          🔑 뼈대가 모든 화면에 있다 — 데스크탑은 왼쪽 사이드바, 폰은 하단 탭.
            오류 화면(error.tsx)과 없는 주소(not-found.tsx)도 레이아웃 안에서 그려지므로
            **막힌 자리에서 나갈 길이 늘 다섯은 있다.**

          🔴 `owner`를 읽느라 레이아웃이 DB를 건드린다. v1에서 금지했던 것이라
            조회 쪽을 던지지 않게 만들었다 — 근거는 lib/owner.ts에 있다.
        */}
        <Shell owner={owner} />

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
