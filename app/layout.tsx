import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteNav } from "./site-nav";

export const metadata: Metadata = {
  title: "한 해, 한 권",
  description:
    "아이가 남긴 것을 그때의 말과 함께 받아두고, 한 해가 지나면 한 권으로 묶습니다. 그래서 실물을 마음 편히 정리할 수 있게 합니다.",
};

// 주 사용자는 폰 세로, 심사자는 노트북 가로다. 둘 다 기준으로 둔다.
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/*
        🔑 상단 바가 모든 화면에 있다. 오류 화면(error.tsx)과 없는 주소(not-found.tsx)도
          레이아웃 안에서 그려지므로, **막힌 자리에서 나갈 길이 늘 하나는 있다.**
      */}
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
