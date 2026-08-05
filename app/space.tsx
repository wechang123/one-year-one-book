"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { depthCue, rotate, sphereVec } from "@/lib/sphere";
import { highlight } from "./highlight";
import { SaidBy } from "./artwork/said-by";

/**
 * 편지 구(sphere) — 봉투들이 한 몸으로 도는 공간.
 *
 * 🔴 전신은 "자리가 고정된 흩어짐"이었다. *"편지가 너무 고정값"*을 받고
 *   구로 갈아엎었다 — 분포·회전·깊이의 근거는 lib/sphere.ts 머리말에 있다.
 *
 * 🔑 회전은 **잠금이 없다.** 지구본처럼 끝까지 돈다. 놓으면 관성으로 돌다 잦아든다 —
 *   관성도 손이 시킨 움직임의 꼬리다. 스스로 도는 자동 회전은 넣지 않았다:
 *   *"스스로 움직이는 화면은 없다"*(13-taste-audit)는 선은 그대로다.
 *   reduced-motion에서는 관성 없이 손을 떼면 바로 선다.
 *
 * 🔑 이 컴포넌트는 클라이언트지만 **첫 화면은 서버가 그린다**(rx=ry=0의 투영).
 *   JS가 없으면 정면이 보이는 정지된 구다 — 링크·hover 미리보기는 그대로 동작한다.
 */

export type SphereItem = {
  id: string;
  band: "before" | "infant" | "child" | null;
  label: string;
  /** 카드에 실을 편지들(평소 첫 통, 검색 중엔 걸린 통들). 없으면 빈 문구. */
  quotes: { id: string; body: string; by: "CHILD" | "PARENT" }[];
  emptyText: string;
  /** 전체 통 수. 1 초과면 봉투가 말한다. */
  count: number;
  photo: { w: number; h: number } | null;
};

export function LetterSphere({ items, q }: { items: SphereItem[]; q: string }) {
  const [view, setView] = useState({ rx: -8, ry: 0, zoom: 1 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const moved = useRef(0);
  /** 마지막 드래그 속도(deg/frame). 관성의 씨앗이다. */
  const velocity = useRef({ rx: 0, ry: 0 });
  const raf = useRef(0);

  // 관성 — 감쇠 0.94/프레임. 손을 뗀 방향으로 돌다 잦아든다.
  const glide = () => {
    velocity.current.rx *= 0.94;
    velocity.current.ry *= 0.94;
    const { rx: vx, ry: vy } = velocity.current;
    if (Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02) return;
    setView((s) => ({ ...s, rx: s.rx + vx, ry: s.ry + vy }));
    raf.current = requestAnimationFrame(glide);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const n = items.length;

  return (
    <div
      className="space"
      onPointerDown={(e) => {
        cancelAnimationFrame(raf.current);
        drag.current = { x: e.clientX, y: e.clientY, rx: view.rx, ry: view.ry };
        moved.current = 0;
        velocity.current = { rx: 0, ry: 0 };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        moved.current = Math.max(moved.current, Math.abs(dx) + Math.abs(dy));
        setView((s) => {
          const next = { ...s, ry: d.ry + dx * 0.35, rx: d.rx - dy * 0.35 };
          // 프레임 간 변화량이 곧 속도다. 마지막 값이 관성으로 이어진다.
          velocity.current = { rx: next.rx - s.rx, ry: next.ry - s.ry };
          return next;
        });
      }}
      onPointerUp={() => {
        drag.current = null;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          raf.current = requestAnimationFrame(glide);
        }
      }}
      onPointerLeave={() => (drag.current = null)}
      onClickCapture={(e) => {
        // 끌고 나서 손을 뗀 자리가 봉투면 브라우저는 클릭으로 본다. 6px 넘었으면 회전이었다.
        if (moved.current > 6) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onWheel={(e) => {
        // 이 화면(≥900px)은 페이지 스크롤이 없다 — 휠의 일은 당겨보기 하나뿐이다.
        e.preventDefault();
        setView((s) => ({ ...s, zoom: Math.max(0.55, Math.min(1.8, s.zoom - e.deltaY * 0.0012)) }));
      }}
    >
      <ol className="space__stage" style={{ transform: `scale(${view.zoom})` }}>
        {items.map((item, i) => {
          const p = rotate(sphereVec(i, n), view.rx, view.ry);
          const cue = depthCue(p.z);
          return (
            <li
              key={item.id}
              className="spot"
              style={
                {
                  /*
                    투영 결과만 스타일로 나간다. 반지름은 CSS 변수(--sph-r)라
                    화면 크기 대응은 CSS가 맡고, 수학은 단위 구 안에서 끝난다.
                  */
                  transform: `translate(-50%, -50%) translate(calc(${p.x.toFixed(4)} * var(--sph-rx)), calc(${p.y.toFixed(4)} * var(--sph-ry))) scale(${cue.scale.toFixed(3)})`,
                  opacity: cue.opacity,
                  "--z": cue.zIndex,
                } as React.CSSProperties
              }
            >
              <Link
                href={`/artwork/${item.id}`}
                className={[
                  "fenv",
                  item.band ? `fenv--${item.band}` : "",
                  // 상반부는 아래로, 하반부는 위로 — 언제나 남은 쪽이 넓은 방향으로 편다.
                  // (-0.15 문턱으로 뒀다가 중심 근처 봉투가 좁은 쪽으로 펴져 잘렸다. 반이 맞다.)
                  p.y < 0 ? "fenv--peekdown" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="fenv__flap" aria-hidden />
                <span className="fenv__seal" aria-hidden />
                <span className="fenv__label">
                  {item.band ? <span className={`age--${item.band}`}>{item.label}</span> : item.label}
                </span>
                <span className="fenv__peek">
                  <img
                    src={`/api/photo/${item.id}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={item.photo ? { aspectRatio: `${item.photo.w} / ${item.photo.h}` } : undefined}
                  />
                  {item.quotes.length > 0 ? (
                    item.quotes.map((quote) => (
                      <span className="fenv__quote" key={quote.id}>
                        <SaidBy by={quote.by} />
                        {highlight(quote.body, q)}
                      </span>
                    ))
                  ) : (
                    <span className="fenv__quote fenv__quote--empty">{item.emptyText}</span>
                  )}
                  {item.count > 1 ? <span className="fenv__more">편지 {item.count}통</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="space__hint" aria-hidden>
        끌어서 돌리기 · 스크롤로 당겨보기
      </p>
    </div>
  );
}
