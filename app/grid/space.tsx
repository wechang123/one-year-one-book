"use client";

import { useRef, useState } from "react";

/**
 * 편지 공간의 손잡이 — 끌면 기울고(궤도), 스크롤하면 당겨진다(줌).
 *
 * 🔑 이 컴포넌트가 하는 일은 CSS 변수 세 개를 바꾸는 것뿐이다.
 *   봉투의 자리·색·hover 미리보기는 전부 서버가 렌더한 마크업과 CSS다.
 *   그래서 JS가 꺼져도 공간이 뜬다 — 잃는 것은 궤도와 줌, 이 손맛 둘뿐이다.
 *   (README의 "JS 없이 동작" 실측이 이 경계 위에 서 있다. 여기 로직을 늘릴 때마다
 *    그 경계가 뒤로 밀리는 것이다.)
 *
 * 🔑 각도를 좁게 잠근다(±12°/±16°). typo.love는 화면이 하나라 뒤집혀도 돌아올 수 있지만,
 *   우리 공간은 목록이다 — 뒤집힌 목록은 목록이 아니다. 기울여 보는 정도까지만 연다.
 */
export function Space3D({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState({ rx: 0, ry: 0, zoom: 1 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const moved = useRef(0);

  return (
    <div
      className="space"
      onPointerDown={(e) => {
        // 봉투 위에서 시작한 드래그도 궤도다. 클릭(이동 없는 down-up)은 링크가 가져간다.
        drag.current = { x: e.clientX, y: e.clientY, rx: view.rx, ry: view.ry };
        moved.current = 0;
      }}
      onPointerMove={(e) => {
        /**
         * 🔴 값을 지역 상수로 먼저 잡는다. setView의 업데이터는 **나중에**(배치로) 실행되는데,
         *   그 전에 pointerup이 drag.current를 null로 만들면 업데이터가 null을 읽고 죽는다 —
         *   실제로 드래그를 놓는 순간 화면 전체가 오류 경계로 떨어졌다(콘솔 캡처).
         */
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        moved.current = Math.max(moved.current, Math.abs(dx) + Math.abs(dy));
        setView((s) => ({
          ...s,
          ry: Math.max(-16, Math.min(16, d.ry + dx * 0.06)),
          rx: Math.max(-12, Math.min(12, d.rx - dy * 0.06)),
        }));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
      onClickCapture={(e) => {
        // 끌고 나서 손을 뗀 자리가 봉투면 브라우저는 그걸 클릭으로 본다.
        // 6px 넘게 움직였으면 궤도였지 클릭이 아니다 — 링크로 새지 않게 막는다.
        if (moved.current > 6) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onWheel={(e) => {
        // 페이지 스크롤을 잡아먹는 대가가 있다. 이 화면(≥900px)에서 공간이 화면을
        // 거의 다 차지해서, 여기서의 스크롤 의도는 "당겨보기"라고 판단했다.
        e.preventDefault();
        const next = Math.max(0.55, Math.min(1.7, view.zoom - e.deltaY * 0.0012));
        setView((s) => ({ ...s, zoom: next }));
      }}
    >
      <div
        className="space__world"
        style={{
          transform: `rotateX(${view.rx}deg) rotateY(${view.ry}deg) scale(${view.zoom})`,
          // 드래그 중에는 전이를 끈다. 손을 따라오는 것이 전이보다 빠르다.
          transition: drag.current ? "none" : undefined,
        }}
      >
        {children}
      </div>
      <p className="space__hint" aria-hidden>
        끌어서 기울이기 · 스크롤로 당겨보기
      </p>
    </div>
  );
}
