/**
 * 앞으로의 일정 — 공공기관이 정한 것만 담는다.
 *
 * ═══════════════════════════════════════════════════════════
 * 🔴 이 파일은 **앱이 만든 잣대가 아니다.**
 *
 *   `lib/age.ts`는 *"축은 있고 잣대는 없다"*를 지킨다 — 앱이 **발달을 판정하지 않는다.**
 *   여기 있는 것은 성격이 다르다. **공공기관이 정해서 공표한 일정**이고,
 *   부모는 어차피 그 일정을 따라 병원에 간다. 앱이 만든 기준이 아니라 **옮겨 적은 기준**이다.
 *
 *   그 구별이 무너지는 순간이 언제인지도 적어둔다 —
 *   **"이 시기에 이걸 했어야 한다"**고 말하기 시작하면 그때부터는 잣대다.
 *   화면은 **창(window)이 열려 있다**는 것까지만 말하고 놓쳤다고 말하지 않는다.
 *
 * ═══════════════════════════════════════════════════════════
 * ⛔ 예방접종은 **일부러 뺐다.**
 *
 *   가장 쓸모 있는 자료지만 넣지 않았다. 이유 셋:
 *     ① 질병관리청 예방접종도우미의 표를 **직접 읽지 못했다**(HTTP 404).
 *        2차 출처에서 옮긴 표는 기준 연도가 2024로 적혀 있는데, 2026년 지침이 따로 있다.
 *     ② 국가예방접종 일정은 **해마다 바뀐다.** 저장소에 박아두면 이듬해에 틀린 값이 된다.
 *     ③ **틀린 접종 시기를 화면에 띄우는 대가가 크다.**
 *   화면이 이 사실을 숨기지 않는다 — 캘린더가 "예방접종은 여기 없습니다"라고 말한다.
 */

import { describeAge, type Birth } from "./age";

/* ─────────────────────────────────────────────────────────
 * 영유아 건강검진 — 국민건강보험공단
 *
 * 출처: 국민건강보험 「영유아 건강검진 안내」
 *       https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do
 * 교차 확인: 구로구보건소 영유아 건강검진 안내(공단 기준 명시)
 *
 * 🔑 **구간이지 날짜가 아니다.** 공단이 정한 것은 "생후 14~35일"처럼 창이고,
 *   그 안 어느 날에 갈지는 부모가 정한다. 앱이 특정 날짜를 찍지 않는다.
 * ───────────────────────────────────────────────────────── */

export type CheckupKind = "health" | "dental";

export type Checkup = {
  kind: CheckupKind;
  /** 몇 차인지. 구강은 건강검진 차수에 붙어 있어 같은 번호를 쓴다. */
  round: number;
  /** 창의 시작·끝. 단위가 섞여 있어(1차만 일 단위) 그대로 옮긴다. */
  from: { days: number } | { months: number };
  to: { days: number } | { months: number };
  label: string;
};

export const CHECKUPS: Checkup[] = [
  { kind: "health", round: 1, from: { days: 14 }, to: { days: 35 }, label: "1차 건강검진" },
  { kind: "health", round: 2, from: { months: 4 }, to: { months: 6 }, label: "2차 건강검진" },
  { kind: "health", round: 3, from: { months: 9 }, to: { months: 12 }, label: "3차 건강검진" },
  { kind: "health", round: 4, from: { months: 18 }, to: { months: 24 }, label: "4차 건강검진" },
  { kind: "health", round: 5, from: { months: 30 }, to: { months: 36 }, label: "5차 건강검진" },
  { kind: "health", round: 6, from: { months: 42 }, to: { months: 48 }, label: "6차 건강검진" },
  { kind: "health", round: 7, from: { months: 54 }, to: { months: 60 }, label: "7차 건강검진" },
  { kind: "health", round: 8, from: { months: 66 }, to: { months: 71 }, label: "8차 건강검진" },

  { kind: "dental", round: 4, from: { months: 18 }, to: { months: 29 }, label: "구강검진" },
  { kind: "dental", round: 5, from: { months: 30 }, to: { months: 41 }, label: "구강검진" },
  { kind: "dental", round: 6, from: { months: 42 }, to: { months: 53 }, label: "구강검진" },
  { kind: "dental", round: 7, from: { months: 54 }, to: { months: 65 }, label: "구강검진" },
];

/* ─────────────────────────────────────────────────────────
 * 산전진찰 주기 — 질병관리청 국가건강정보포털
 *
 * 출처: 「정상임신관리(임신의 진단과 관리)」
 *       https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/...cntnts_sn=6301
 * 원문: "28주까지 4주에 한 번, 36주까지 2주에 한 번, 그 이후에는 매주 정기적으로 병원을 방문합니다."
 *
 * 🔴 **날짜를 만들어내지 않는다.** 출처가 준 것은 **간격**이지 방문일이 아니다.
 *   "임신 12주에 1차, 16주에 2차…" 같은 표를 앱이 지어내면 그건 출처에 없는 값이다.
 *   화면은 **지금 몇 주인지**(예정일에서 정확히 나온다)와 **지금 구간의 권장 간격**만 말한다.
 * ───────────────────────────────────────────────────────── */

export type PrenatalCadence = { untilWeek: number | null; everyWeeks: number; label: string };

export const PRENATAL_CADENCE: PrenatalCadence[] = [
  { untilWeek: 28, everyWeeks: 4, label: "4주에 한 번" },
  { untilWeek: 36, everyWeeks: 2, label: "2주에 한 번" },
  { untilWeek: null, everyWeeks: 1, label: "매주" },
];

export function cadenceForWeek(week: number): PrenatalCadence {
  return (
    PRENATAL_CADENCE.find((c) => c.untilWeek !== null && week <= c.untilWeek) ??
    PRENATAL_CADENCE[PRENATAL_CADENCE.length - 1]
  );
}

/* ─────────────────────────────────────────────────────────
 * 창(window)을 실제 날짜로 편다
 * ───────────────────────────────────────────────────────── */

const DAY = 24 * 60 * 60 * 1000;

/** date 컬럼과 같은 규칙 — UTC 자정으로 맞춘다. */
function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function shift(from: Date, by: Checkup["from"]): Date {
  const base = utcDay(from);
  if ("days" in by) return new Date(base.getTime() + by.days * DAY);
  /* 개월은 달력으로 더한다. 30일로 곱하면 "18개월"이 실제 18개월과 어긋난다. */
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + by.months, base.getUTCDate()),
  );
}

export type CheckupWindow = Checkup & { start: Date; end: Date };

/**
 * 태어난 날을 알면 창이 실제 날짜가 된다. 모르면 아무것도 돌려주지 않는다 —
 * ⛔ **앱은 모르는 것으로 날짜를 만들지 않는다.**
 */
export function checkupWindows(birth: Birth): CheckupWindow[] {
  if (!birth.bornOn) return [];
  return CHECKUPS.map((c) => ({
    ...c,
    start: shift(birth.bornOn as Date, c.from),
    end: shift(birth.bornOn as Date, c.to),
  }));
}

export type WindowState = "past" | "open" | "future";

export function windowState(w: CheckupWindow, today: Date): WindowState {
  const t = utcDay(today).getTime();
  if (t < w.start.getTime()) return "future";
  if (t > w.end.getTime()) return "past";
  return "open";
}

/**
 * 오늘 열려 있는 창.
 *
 * 🔑 **지나간 창을 "놓쳤다"고 말하지 않는다.** 실제로 받았는지 앱은 모른다.
 *   모르는 것을 아는 것처럼 말하는 순간 이 파일은 잣대가 된다.
 */
export function openWindows(birth: Birth, today: Date): CheckupWindow[] {
  return checkupWindows(birth).filter((w) => windowState(w, today) === "open");
}

/** 지금 임신 몇 주인가. 임신 중이 아니면 null. */
export function pregnancyWeek(birth: Birth, today: Date): number | null {
  const when = describeAge(utcDay(today), birth);
  if (when.scale !== "prenatal") return null;
  const m = when.label.match(/임신 (\d+)주/);
  return m ? Number(m[1]) : null;
}
