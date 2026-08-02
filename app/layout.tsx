import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "아이 작품 아카이브",
  description: "아이가 만든 것을 아이의 말과 함께 남기고, 한 해가 지나면 한 권으로 묶습니다.",
};

// 주 사용자는 폰 세로, 심사자는 노트북 가로다. 둘 다 기준으로 둔다.
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
