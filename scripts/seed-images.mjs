/**
 * 시드 이미지를 만든다. `node scripts/seed-images.mjs`
 *
 * ⚠️ **앱은 이 스크립트를 부르지 않는다.** 결과물(public/seed/*.jpg)만 커밋되고,
 *   도커 이미지에는 그 JPEG만 들어간다. 여기 있는 이유는 **다시 만들 수 있게 하기 위해서**다.
 *
 * 🔑 왜 이미지 생성 모델이 아니라 코드인가 — **재현성**이다.
 *   확산 모델은 같은 프롬프트로 같은 그림을 다시 못 준다. 그러면 저장소가
 *   **자기 시드를 다시 만들 수 없고**, 시드가 바뀌면 화면 문구·문서의 숫자가 같이 흔들린다.
 *   여기서는 난수까지 고정 시드(mulberry32)라 **몇 번을 돌려도 같은 바이트가 나온다.**
 *   생성 규칙은 docs/04b에 프롬프트 형태로 적어뒀다.
 *
 * 🔑 손그림처럼 보이게 하는 방법도 필터가 아니라 좌표다.
 *   feTurbulence 같은 SVG 필터는 래스터라이저마다 지원이 갈린다.
 *   대신 **점 좌표를 흔들어서** 선을 떨리게 만든다. 어디서 돌려도 같은 결과가 나온다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "seed");

/* ── 결정적 난수 ───────────────────────────────────────── */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const jit = (r, amt) => (r() - 0.5) * 2 * amt;

/* ── 손그림 선 ─────────────────────────────────────────── */

/** 두 점 사이를 여러 도막으로 나누고 각 도막을 흔든다. */
function wobble(pts, r, amt) {
  return pts.map(([x, y]) => [x + jit(r, amt), y + jit(r, amt)]);
}

function poly(pts, close = false) {
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return close ? `${d} Z` : d;
}

function segLine(x1, y1, x2, y2, r, amt = 3, steps = 8) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
  }
  return poly(wobble(pts, r, amt));
}

function blob(cx, cy, rx, ry, r, amt = 8, steps = 22) {
  const pts = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return poly(wobble(pts, r, amt), true);
}

/**
 * 크레용 한 획 = 같은 길을 살짝 어긋나게 두세 번 긋는다.
 * 아이 그림에서 선이 한 번에 안 그어지는 것이 이 서비스가 담으려는 물건의 성질이다.
 */
function crayon(d, color, w, r, passes = 3) {
  let out = "";
  for (let i = 0; i < passes; i += 1) {
    const dx = jit(r, 1.6).toFixed(1);
    const dy = jit(r, 1.6).toFixed(1);
    const o = (0.42 + r() * 0.28).toFixed(2);
    out += `<path d="${d}" transform="translate(${dx},${dy})" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
  }
  return out;
}

function fillBlob(d, color, r, alpha = 0.85) {
  return `<path d="${d}" fill="${color}" opacity="${alpha}"/>${crayon(d, color, 5, r, 2)}`;
}

/* ── 종이 위에 놓기 ────────────────────────────────────── */

const DESK = "#c9c5bd";

/**
 * 종이를 살짝 기울여 바닥 위에 올린다.
 *
 * 🔑 기울기와 그림자가 이 파일에서 제일 중요한 두 줄이다.
 *   이 서비스의 전제가 *"실물이 쌓여서 버려야 한다"*인데, 반듯한 사각형 이미지는
 *   화면 안에서 태어난 것처럼 보인다. **찍은 것처럼 보여야 버릴 실물이 있는 것으로 읽힌다.**
 *   docs/04b가 생성 이미지를 접었던 이유가 정확히 이 지점이었다.
 */
function sheet(W, H, tilt, paper, inner) {
  const m = Math.round(Math.min(W, H) * 0.045);
  const w = W - m * 2;
  const h = H - m * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${DESK}"/>
  <g transform="rotate(${tilt} ${W / 2} ${H / 2})">
    <rect x="${m + 5}" y="${m + 9}" width="${w}" height="${h}" fill="#000" opacity="0.13"/>
    <rect x="${m}" y="${m}" width="${w}" height="${h}" fill="${paper}"/>
    <g transform="translate(${m},${m})">${inner(w, h)}</g>
  </g>
</svg>`;
}

/* ── 12점 ──────────────────────────────────────────────── */

/** 초음파 출력지. 검은 배경에 부채꼴, 그 안에 흐린 덩어리. */
function ultrasound(seed, label, weeks) {
  const r = rng(seed);
  return (W, H) =>
    `<rect width="${W}" height="${H}" fill="#f4f2ee"/>
     <rect x="${W * 0.06}" y="${H * 0.1}" width="${W * 0.88}" height="${H * 0.72}" fill="#0b0b0d"/>
     <clipPath id="cone"><path d="M${W / 2} ${H * 0.12} L${W * 0.1} ${H * 0.8} L${W * 0.9} ${H * 0.8} Z"/></clipPath>
     <g clip-path="url(#cone)">
       <path d="M${W / 2} ${H * 0.12} L${W * 0.1} ${H * 0.8} L${W * 0.9} ${H * 0.8} Z" fill="#1b1b1f"/>
       ${Array.from({ length: 26 }, () => {
         const cx = W * (0.2 + r() * 0.6);
         const cy = H * (0.25 + r() * 0.5);
         const rx = W * (0.04 + r() * 0.13);
         return `<path d="${blob(cx, cy, rx, rx * (0.5 + r()), r, 10)}" fill="#8b8880" opacity="${(0.05 + r() * 0.13).toFixed(2)}"/>`;
       }).join("")}
       ${/* 태아 윤곽 — 머리 하나와 몸통 하나. 그 이상은 만들지 않는다. */ ""}
       <path d="${blob(W * 0.46, H * 0.4, W * 0.16, W * 0.15, r, 7)}" fill="#d8d4c8" opacity="0.55"/>
       <path d="${blob(W * 0.46, H * 0.4, W * 0.13, W * 0.12, r, 6)}" fill="#2a2a2c" opacity="0.5"/>
       <path d="${blob(W * 0.56, H * 0.56, W * 0.17, W * 0.13, r, 9)}" fill="#cfcbbf" opacity="0.4"/>
     </g>
     <text x="${W * 0.09}" y="${H * 0.16}" font-family="monospace" font-size="${Math.round(W * 0.032)}" fill="#c9c6bd">${label}</text>
     <text x="${W * 0.09}" y="${H * 0.205}" font-family="monospace" font-size="${Math.round(W * 0.032)}" fill="#c9c6bd">GA ${weeks}</text>
     <text x="${W * 0.09}" y="${H * 0.9}" font-family="sans-serif" font-size="${Math.round(W * 0.03)}" fill="#7d7a72">하늘</text>`;
}

/** 배냇저고리를 펼쳐놓고 위에서 찍은 것. */
function firstClothes(seed) {
  const r = rng(seed);
  return (W, H) => {
    const cx = W / 2;
    const cy = H * 0.52;
    const bw = W * 0.2;
    const bh = H * 0.24;
    const body = poly(
      wobble(
        [
          [cx - bw, cy - bh],
          [cx - bw * 2.3, cy - bh * 0.55],
          [cx - bw * 2.5, cy + bh * 0.15],
          [cx - bw * 1.15, cy + bh * 0.05],
          [cx - bw * 1.0, cy + bh * 1.5],
          [cx + bw * 1.0, cy + bh * 1.5],
          [cx + bw * 1.15, cy + bh * 0.05],
          [cx + bw * 2.5, cy + bh * 0.15],
          [cx + bw * 2.3, cy - bh * 0.55],
          [cx + bw, cy - bh],
        ],
        r,
        4,
      ),
      true,
    );
    return `<rect width="${W}" height="${H}" fill="#efece5"/>
      <path d="${body}" fill="#fdfbf6" stroke="#e3ded2" stroke-width="3"/>
      <path d="${body}" transform="translate(4,7)" fill="#000" opacity="0.05"/>
      <path d="${segLine(cx - bw * 0.5, cy - bh * 0.95, cx + bw * 0.5, cy - bh * 0.95, r, 2)}" fill="none" stroke="#e0dacd" stroke-width="5"/>
      <path d="${segLine(cx, cy - bh * 0.9, cx, cy + bh * 1.4, r, 3)}" fill="none" stroke="#e6e1d6" stroke-width="4"/>
      ${Array.from({ length: 3 }, (_, i) => {
        const y = cy + bh * (0.15 + i * 0.45);
        return `<circle cx="${(cx + bw * 0.42).toFixed(1)}" cy="${y.toFixed(1)}" r="${(W * 0.011).toFixed(1)}" fill="#efe7d6" stroke="#ded6c5" stroke-width="2"/>`;
      }).join("")}
      <path d="${segLine(cx - bw * 1.0, cy + bh * 1.5, cx + bw * 1.0, cy + bh * 1.5, r, 3)}" fill="none" stroke="#e8e2d5" stroke-width="6"/>`;
  };
}

/** 도화지에 찍은 손도장 두 개. 하나는 번졌다. */
function handprint(seed) {
  const r = rng(seed);
  const palm = (cx, cy, s, color, alpha) => {
    let out = `<path d="${blob(cx, cy, s * 0.62, s * 0.7, r, s * 0.09)}" fill="${color}" opacity="${alpha}"/>`;
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI * (0.86 - i * 0.18);
      const len = s * (i === 0 ? 0.72 : 1.02 - Math.abs(i - 2.4) * 0.08);
      const fx = cx + Math.cos(a) * len;
      const fy = cy + Math.sin(a) * len;
      out += `<path d="${blob(fx, fy, s * 0.19, s * 0.26, r, s * 0.05)}" fill="${color}" opacity="${alpha}"/>`;
      out += `<path d="${segLine(cx, cy, fx, fy, r, 2, 4)}" fill="none" stroke="${color}" stroke-width="${s * 0.3}" stroke-linecap="round" opacity="${alpha * 0.9}"/>`;
    }
    return out;
  };
  return (W, H) =>
    `<rect width="${W}" height="${H}" fill="#fdfaf2"/>
     ${palm(W * 0.34, H * 0.42, W * 0.2, "#4f7fb5", 0.82)}
     ${palm(W * 0.66, H * 0.62, W * 0.2, "#4f7fb5", 0.5)}
     <path d="${blob(W * 0.7, H * 0.72, W * 0.06, W * 0.04, r, 6)}" fill="#4f7fb5" opacity="0.3"/>`;
}

/** 두족인 — 머리에 팔다리가 바로 붙는다. */
function tadpole(seed) {
  const r = rng(seed);
  return (W, H) => {
    const cx = W * 0.5;
    const cy = H * 0.42;
    const rad = W * 0.24;
    let s = `<rect width="${W}" height="${H}" fill="#fdfbf4"/>`;
    s += crayon(blob(cx, cy, rad, rad * 1.05, r, 7), "#3f3a34", 7, r);
    // 눈 두 개와 입
    s += crayon(blob(cx - rad * 0.36, cy - rad * 0.18, rad * 0.1, rad * 0.11, r, 3), "#3f3a34", 5, r, 2);
    s += crayon(blob(cx + rad * 0.34, cy - rad * 0.2, rad * 0.11, rad * 0.1, r, 3), "#3f3a34", 5, r, 2);
    s += crayon(segLine(cx - rad * 0.3, cy + rad * 0.34, cx + rad * 0.28, cy + rad * 0.3, r, 4, 5), "#c4553f", 7, r, 2);
    // 팔다리가 머리에서 바로 나온다
    s += crayon(segLine(cx - rad * 0.9, cy + rad * 0.1, cx - rad * 1.9, cy - rad * 0.25, r, 5, 5), "#3f3a34", 7, r);
    s += crayon(segLine(cx + rad * 0.9, cy + rad * 0.05, cx + rad * 1.95, cy - rad * 0.3, r, 5, 5), "#3f3a34", 7, r);
    s += crayon(segLine(cx - rad * 0.4, cy + rad * 0.95, cx - rad * 0.62, cy + rad * 2.3, r, 5, 6), "#3f3a34", 7, r);
    s += crayon(segLine(cx + rad * 0.4, cy + rad * 0.95, cx + rad * 0.66, cy + rad * 2.35, r, 5, 6), "#3f3a34", 7, r);
    // 머리카락 몇 가닥
    for (let i = 0; i < 6; i += 1) {
      const x = cx - rad * 0.6 + (rad * 1.2 * i) / 5;
      s += crayon(segLine(x, cy - rad * 0.95, x + jit(r, 12), cy - rad * 1.45, r, 4, 3), "#6b4a2f", 6, r, 2);
    }
    return s;
  };
}

/** 색칠 낙서 — 아직 형태가 아니다. */
function scribble(seed) {
  const r = rng(seed);
  const colors = ["#c4553f", "#3f6fa8", "#d29b2c", "#4b8b56", "#7a4b8b"];
  return (W, H) => {
    let s = `<rect width="${W}" height="${H}" fill="#fdfbf4"/>`;
    for (let i = 0; i < 9; i += 1) {
      const c = colors[i % colors.length];
      const pts = [];
      let x = W * (0.15 + r() * 0.6);
      let y = H * (0.2 + r() * 0.55);
      for (let k = 0; k < 14; k += 1) {
        pts.push([x, y]);
        x += jit(r, W * 0.09);
        y += jit(r, H * 0.09);
      }
      s += crayon(poly(wobble(pts, r, 5)), c, 11 + r() * 8, r, 2);
    }
    return s;
  };
}

/** 가족 — 넷이 나란히, 전부 이빨을 드러내고 웃는다. */
function family(seed) {
  const r = rng(seed);
  const person = (cx, cy, s, color) => {
    let out = crayon(blob(cx, cy, s, s * 1.05, r, 6), "#3f3a34", 6, r);
    out += crayon(blob(cx - s * 0.34, cy - s * 0.2, s * 0.09, s * 0.1, r, 2), "#3f3a34", 4, r, 2);
    out += crayon(blob(cx + s * 0.33, cy - s * 0.21, s * 0.09, s * 0.1, r, 2), "#3f3a34", 4, r, 2);
    // 이빨 — 톱니로 그린다. 무서운 게 아니라 웃는 것이다.
    const teeth = [];
    for (let i = 0; i <= 8; i += 1) {
      teeth.push([cx - s * 0.4 + (s * 0.8 * i) / 8, cy + s * 0.3 + (i % 2 ? s * 0.16 : 0)]);
    }
    out += crayon(poly(wobble(teeth, r, 2)), "#3f3a34", 5, r, 2);
    out += crayon(segLine(cx, cy + s * 1.02, cx, cy + s * 2.3, r, 4, 5), color, 9, r);
    out += crayon(segLine(cx - s * 0.9, cy + s * 1.5, cx + s * 0.9, cy + s * 1.45, r, 4, 5), color, 7, r);
    out += crayon(segLine(cx - s * 0.3, cy + s * 2.3, cx - s * 0.5, cy + s * 3.1, r, 4, 4), color, 7, r);
    out += crayon(segLine(cx + s * 0.3, cy + s * 2.3, cx + s * 0.5, cy + s * 3.15, r, 4, 4), color, 7, r);
    return out;
  };
  return (W, H) => {
    let s = `<rect width="${W}" height="${H}" fill="#fdfbf4"/>`;
    const ys = H * 0.32;
    s += person(W * 0.2, ys, W * 0.072, "#3f6fa8");
    s += person(W * 0.4, ys, W * 0.068, "#c4553f");
    s += person(W * 0.6, ys + H * 0.05, W * 0.055, "#4b8b56");
    s += person(W * 0.79, ys + H * 0.07, W * 0.048, "#d29b2c");
    s += crayon(segLine(W * 0.06, H * 0.86, W * 0.94, H * 0.84, r, 5, 10), "#4b8b56", 10, r, 2);
    return s;
  };
}

/** 상장. 실명처럼 보이는 이름은 안 쓴다 — 시드 아이 이름만. */
function award(seed) {
  const r = rng(seed);
  return (W, H) => {
    const inset = W * 0.07;
    return `<rect width="${W}" height="${H}" fill="#fdfaf0"/>
      <rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" fill="none" stroke="#b08d3f" stroke-width="6"/>
      <rect x="${inset + 12}" y="${inset + 12}" width="${W - inset * 2 - 24}" height="${H - inset * 2 - 24}" fill="none" stroke="#b08d3f" stroke-width="2"/>
      <text x="${W / 2}" y="${H * 0.24}" text-anchor="middle" font-family="serif" font-size="${Math.round(W * 0.13)}" fill="#2f2a22" letter-spacing="${W * 0.03}">상 장</text>
      <text x="${W / 2}" y="${H * 0.38}" text-anchor="middle" font-family="serif" font-size="${Math.round(W * 0.052)}" fill="#2f2a22">하 늘</text>
      <text x="${W / 2}" y="${H * 0.5}" text-anchor="middle" font-family="serif" font-size="${Math.round(W * 0.042)}" fill="#3a352c">위 어린이는 한 학기 동안</text>
      <text x="${W / 2}" y="${H * 0.56}" text-anchor="middle" font-family="serif" font-size="${Math.round(W * 0.042)}" fill="#3a352c">책을 즐겨 읽었으므로</text>
      <text x="${W / 2}" y="${H * 0.62}" text-anchor="middle" font-family="serif" font-size="${Math.round(W * 0.042)}" fill="#3a352c">이 상장을 드립니다.</text>
      <text x="${W / 2}" y="${H * 0.76}" text-anchor="middle" font-family="serif" font-size="${Math.round(W * 0.04)}" fill="#3a352c">2026년 3월 20일</text>
      <path d="${blob(W * 0.72, H * 0.82, W * 0.07, W * 0.07, r, 3)}" fill="none" stroke="#a63f33" stroke-width="5" opacity="0.75"/>
      <text x="${W * 0.72}" y="${H * 0.835}" text-anchor="middle" font-family="serif" font-size="${Math.round(W * 0.03)}" fill="#a63f33" opacity="0.8">도장</text>`;
  };
}

/** 자화상 — 몸이 없는 것(A)과 생긴 것(B). 같은 손이 그린 것으로 보여야 한다. */
function selfPortrait(seed, withBody) {
  const r = rng(seed);
  return (W, H) => {
    const cx = W * 0.5;
    const cy = H * (withBody ? 0.3 : 0.42);
    const rad = W * (withBody ? 0.17 : 0.22);
    let s = `<rect width="${W}" height="${H}" fill="#fdfbf4"/>`;
    s += crayon(blob(cx, cy, rad, rad * 1.06, r, 6), "#3f3a34", 6, r);
    s += crayon(blob(cx - rad * 0.35, cy - rad * 0.15, rad * 0.1, rad * 0.12, r, 3), "#3f3a34", 5, r, 2);
    s += crayon(blob(cx + rad * 0.33, cy - rad * 0.17, rad * 0.1, rad * 0.12, r, 3), "#3f3a34", 5, r, 2);
    s += crayon(segLine(cx - rad * 0.28, cy + rad * 0.36, cx + rad * 0.3, cy + rad * 0.32, r, 3, 5), "#c4553f", 6, r, 2);
    for (let i = 0; i < 7; i += 1) {
      const x = cx - rad * 0.7 + (rad * 1.4 * i) / 6;
      s += crayon(segLine(x, cy - rad * 0.95, x + jit(r, 10), cy - rad * 1.5, r, 4, 3), "#6b4a2f", 6, r, 2);
    }
    if (withBody) {
      const by = cy + rad * 1.1;
      const bw = rad * 0.8;
      const bh = H * 0.28;
      s += crayon(
        poly(
          wobble(
            [
              [cx - bw, by],
              [cx + bw, by],
              [cx + bw * 0.9, by + bh],
              [cx - bw * 0.9, by + bh],
            ],
            r,
            5,
          ),
          true,
        ),
        "#3f6fa8",
        7,
        r,
      );
      s += crayon(segLine(cx - bw, by + bh * 0.15, cx - bw * 2.1, by + bh * 0.55, r, 5, 5), "#3f3a34", 7, r);
      s += crayon(segLine(cx + bw, by + bh * 0.12, cx + bw * 2.2, by + bh * 0.5, r, 5, 5), "#3f3a34", 7, r);
      s += crayon(segLine(cx - bw * 0.45, by + bh, cx - bw * 0.6, by + bh * 1.9, r, 5, 5), "#3f3a34", 7, r);
      s += crayon(segLine(cx + bw * 0.45, by + bh, cx + bw * 0.62, by + bh * 1.95, r, 5, 5), "#3f3a34", 7, r);
    } else {
      s += crayon(segLine(cx - rad * 0.95, cy + rad * 0.2, cx - rad * 2.0, cy - rad * 0.1, r, 5, 5), "#3f3a34", 7, r);
      s += crayon(segLine(cx + rad * 0.95, cy + rad * 0.15, cx + rad * 2.05, cy - rad * 0.15, r, 5, 5), "#3f3a34", 7, r);
      s += crayon(segLine(cx - rad * 0.4, cy + rad * 1.0, cx - rad * 0.6, cy + rad * 2.2, r, 5, 5), "#3f3a34", 7, r);
      s += crayon(segLine(cx + rad * 0.4, cy + rad * 1.0, cx + rad * 0.62, cy + rad * 2.25, r, 5, 5), "#3f3a34", 7, r);
    }
    return s;
  };
}

/** 종이접기 — 삼각 모자 하나가 책상에 놓여 있다. */
function paperFold(seed) {
  const r = rng(seed);
  return (W, H) => {
    const cx = W * 0.5;
    const base = H * 0.68;
    const half = W * 0.22;
    const top = H * 0.3;
    const outer = poly(
      wobble(
        [
          [cx - half, base],
          [cx, top],
          [cx + half, base],
        ],
        r,
        4,
      ),
      true,
    );
    return `<rect width="${W}" height="${H}" fill="#efece5"/>
      <path d="${outer}" transform="translate(6,10)" fill="#000" opacity="0.10"/>
      <path d="${outer}" fill="#e8564a"/>
      <path d="${poly(wobble([[cx - half, base],[cx, top],[cx, base]], r, 4), true)}" fill="#d34a3f"/>
      <path d="${segLine(cx - half * 0.62, base - H * 0.09, cx + half * 0.62, base - H * 0.09, r, 3)}" fill="none" stroke="#fdfbf4" stroke-width="7" opacity="0.85"/>
      <path d="${segLine(cx - half, base, cx + half, base, r, 3)}" fill="none" stroke="#b73a31" stroke-width="5"/>
      <path d="${blob(cx, base + H * 0.03, half * 1.05, H * 0.02, r, 5)}" fill="#000" opacity="0.08"/>`;
  };
}

/** 닭 — 볏과 부리가 크고, 다리가 두 줄이다. */
function rooster(seed) {
  const r = rng(seed);
  return (W, H) => {
    const cx = W * 0.46;
    const cy = H * 0.55;
    const bw = W * 0.16;
    let s = `<rect width="${W}" height="${H}" fill="#fdfbf4"/>`;
    s += fillBlob(blob(cx, cy, bw, bw * 0.86, r, 8), "#d9b24a", r, 0.75);
    const hx = cx - bw * 1.05;
    const hy = cy - bw * 0.8;
    s += fillBlob(blob(hx, hy, bw * 0.42, bw * 0.44, r, 5), "#d9b24a", r, 0.8);
    // 볏
    s += fillBlob(
      poly(
        wobble(
          [
            [hx - bw * 0.3, hy - bw * 0.4],
            [hx - bw * 0.15, hy - bw * 0.85],
            [hx, hy - bw * 0.45],
            [hx + bw * 0.15, hy - bw * 0.95],
            [hx + bw * 0.3, hy - bw * 0.42],
          ],
          r,
          4,
        ),
        true,
      ),
      "#c4402f",
      r,
      0.85,
    );
    // 부리
    s += fillBlob(
      poly(
        wobble(
          [
            [hx - bw * 0.4, hy + bw * 0.02],
            [hx - bw * 1.0, hy + bw * 0.16],
            [hx - bw * 0.4, hy + bw * 0.3],
          ],
          r,
          3,
        ),
        true,
      ),
      "#e08a2a",
      r,
      0.9,
    );
    s += crayon(blob(hx + bw * 0.05, hy - bw * 0.05, bw * 0.07, bw * 0.07, r, 2), "#3f3a34", 4, r, 2);
    // 꼬리
    for (let i = 0; i < 4; i += 1) {
      s += crayon(
        segLine(cx + bw * 0.9, cy - bw * 0.1, cx + bw * (1.9 + i * 0.12), cy - bw * (0.8 + i * 0.35), r, 5, 5),
        ["#3f6fa8", "#4b8b56", "#c4402f", "#7a4b8b"][i],
        9,
        r,
        2,
      );
    }
    // 다리 두 줄
    s += crayon(segLine(cx - bw * 0.25, cy + bw * 0.82, cx - bw * 0.32, cy + bw * 1.9, r, 4, 4), "#e08a2a", 7, r);
    s += crayon(segLine(cx + bw * 0.3, cy + bw * 0.8, cx + bw * 0.38, cy + bw * 1.92, r, 4, 4), "#e08a2a", 7, r);
    s += crayon(segLine(cx - bw * 0.55, cy + bw * 1.95, cx - bw * 0.1, cy + bw * 1.88, r, 3, 3), "#e08a2a", 6, r, 2);
    s += crayon(segLine(cx + bw * 0.15, cy + bw * 1.97, cx + bw * 0.6, cy + bw * 1.9, r, 3, 3), "#e08a2a", 6, r, 2);
    s += crayon(segLine(W * 0.05, H * 0.88, W * 0.95, H * 0.86, r, 5, 10), "#4b8b56", 9, r, 2);
    return s;
  };
}

/* ── 목록 ──────────────────────────────────────────────── */

const SHEETS = [
  ["01-scan-14w.jpg", 900, 1200, -1.1, "#f4f2ee", ultrasound(101, "2018.09.12", "14w5d")],
  ["02-scan-32w.jpg", 900, 1200, 0.9, "#f4f2ee", ultrasound(102, "2019.01.16", "32w5d")],
  ["03-first-clothes.jpg", 1280, 960, -0.8, "#efece5", firstClothes(103)],
  ["04-handprint.jpg", 900, 1200, 1.3, "#fdfaf2", handprint(104)],
  ["05-tadpole.jpg", 900, 1240, -1.4, "#fdfbf4", tadpole(105)],
  ["06-scribble.jpg", 1280, 930, 1.0, "#fdfbf4", scribble(106)],
  ["07-family.jpg", 1280, 930, -0.7, "#fdfbf4", family(107)],
  ["08-award.jpg", 880, 1244, 1.2, "#fdfaf0", award(108)],
  ["09-self-a.jpg", 900, 1240, -1.2, "#fdfbf4", selfPortrait(109, false)],
  ["10-self-b.jpg", 900, 1240, 0.8, "#fdfbf4", selfPortrait(110, true)],
  ["11-paper-fold.jpg", 1280, 960, -1.0, "#efece5", paperFold(111)],
  ["12-rooster.jpg", 1280, 930, 1.1, "#fdfbf4", rooster(112)],
];

/**
 * 종이 결.
 *
 * 🔑 이것 하나로 "화면에서 태어난 그림"과 "찍은 종이"가 갈린다.
 *   overlay 합성이라 중간 회색(128)은 아무 일도 안 하고, 편차만 결로 남는다.
 */
async function grain(buf, W, H) {
  const noise = await sharp({
    create: { width: W, height: H, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 7 } },
  })
    .png()
    .toBuffer();
  return sharp(buf).composite([{ input: noise, blend: "overlay" }]).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
}

mkdirSync(OUT, { recursive: true });

let total = 0;
for (const [name, W, H, tilt, paper, inner] of SHEETS) {
  const svg = sheet(W, H, tilt, paper, inner);
  const flat = await sharp(Buffer.from(svg)).png().toBuffer();
  const out = await grain(flat, W, H);
  writeFileSync(join(OUT, name), out);
  total += out.length;
  console.log(`${name.padEnd(24)} ${W}×${H}  ${(out.length / 1024).toFixed(0)}KB`);
}
console.log(`\n${SHEETS.length}장 · 합계 ${(total / 1024).toFixed(0)}KB`);
