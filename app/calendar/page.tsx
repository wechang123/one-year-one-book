import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { getNow } from "@/lib/now";
import { describeAge, timeBand } from "@/lib/age";
import {
  cadenceForWeek,
  checkupWindows,
  openWindows,
  pregnancyWeek,
  windowState,
  type CheckupWindow,
} from "@/lib/schedule";
import { ArrowLeft, ArrowRight, CalendarDays } from "../icons";

/**
 * 캘린더 — 지난 기록과 앞으로의 창을 같은 달력에 놓는다.
 *
 * ═══════════════════════════════════════════════════════════
 * 🔴 이 화면은 이 저장소가 지켜온 규칙 하나와 **부딪힐 뻔했다.**
 *
 *   `⛔ 주기·마감·창(window) 규칙을 만들지 않는다` — 등록은 언제나 열려 있어야 하고
 *   앱이 사용자를 재촉하지 않는다는 뜻이었다. 그 규칙은 **지금도 그대로다.**
 *   여기 뜨는 창은 **등록의 창이 아니라 검진의 창**이고, 그건 앱이 만든 것이 아니라
 *   국민건강보험공단이 정해 공표한 것이다(lib/schedule.ts).
 *
 * 🔑 그래서 이 화면이 **하지 않는** 것을 먼저 정했다.
 *   · 지나간 창을 "놓쳤다"고 하지 않는다 — 실제로 받았는지 앱은 모른다.
 *   · 산전진찰 날짜를 만들어내지 않는다 — 출처가 준 것은 **간격**이지 날짜가 아니다.
 *   · 예방접종은 아예 넣지 않았다 — 공식 표를 직접 못 읽었다. 화면이 그 사실을 말한다.
 */
export const dynamic = "force-dynamic";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 그 달의 격자를 만든다. 앞뒤로 빈 칸을 채워 항상 7의 배수가 되게 한다.
 * 🔑 `date` 컬럼이 전부 UTC 자정이라 달력도 UTC로 짠다 — 지역 시간으로 섞으면 하루가 밀린다.
 */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(new Date(Date.UTC(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function coversDay(w: CheckupWindow, day: Date): boolean {
  return day.getTime() >= w.start.getTime() && day.getTime() <= w.end.getTime();
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  // 앱의 "지금"은 한 곳(lib/now.ts)에서만 나온다. 여기만 new Date()면 데모 시각이 갈라진다.
  const today = utcDay(getNow());

  /*
    🔑 보고 있는 달은 주소가 정한다(`?m=2026-08`). 상태를 안 쓰는 이유:
      **달을 넘긴 화면이 주소로 남아야** 뒤로가기가 달력에서도 동작한다.
      JS가 꺼져도 앞뒤 이동이 그대로 된다.
  */
  const parsed = m && /^\d{4}-\d{2}$/.test(m) ? m.split("-").map(Number) : null;
  const year = parsed ? parsed[0] : today.getUTCFullYear();
  const month = parsed ? parsed[1] - 1 : today.getUTCMonth();
  const cursor = new Date(Date.UTC(year, month, 1));

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  const birth = { dueOn: profile?.dueOn ?? null, bornOn: profile?.bornOn ?? null };

  const artworks = await prisma.artwork.findMany({
    where: {
      ...(profile ? { profileId: profile.id } : {}),
      madeOn: { gte: cursor, lt: new Date(Date.UTC(year, month + 1, 1)) },
    },
    orderBy: [{ madeOn: "asc" }],
    select: {
      id: true,
      madeOn: true,
      // 달력 칸은 한 통만 싣는 자리다 — 첫 통(그때의 말)이 대표다. (lib/letter.ts)
      letters: {
        orderBy: [{ writtenOn: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: { body: true },
      },
    },
  });

  const byDay = new Map<string, typeof artworks>();
  for (const a of artworks) {
    const k = key(a.madeOn);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }

  const windows = checkupWindows(birth);
  const cells = monthGrid(year, month);

  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const ym = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const week = pregnancyWeek(birth, today);
  const openNow = openWindows(birth, today);

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__text">
          <p className="masthead__meta">지난 기록과 앞으로의 검진을 한 장에</p>
          <h1 className="masthead__title">캘린더</h1>
        </div>
      </header>

      {/*
        🔑 오늘 무엇이 열려 있는지를 달력보다 먼저 말한다.
          달력은 훑는 화면이고, 지금 해당되는 것은 훑기 전에 알아야 한다.
      */}
      <section className="cal__now">
        {week !== null ? (
          <p className="cal__now-line">
            <span className="age--before">임신 {week}주</span>입니다. 이 구간의 산전진찰 권장
            간격은 <strong>{cadenceForWeek(week).label}</strong>입니다.
          </p>
        ) : null}

        {openNow.length > 0 ? (
          <p className="cal__now-line">
            지금 열려 있는 검진:{" "}
            <strong>{openNow.map((w) => w.label).join(" · ")}</strong>
          </p>
        ) : (
          <p className="cal__now-line cal__now-line--quiet">지금 열려 있는 검진 창은 없습니다.</p>
        )}
      </section>

      <nav className="cal__nav" aria-label="달 이동">
        <Link href={`/calendar?m=${ym(prev)}`} className="btn btn--ghost">
          <ArrowLeft />
          {prev.getUTCMonth() + 1}월
        </Link>
        <h2 className="cal__title">
          <CalendarDays />
          {year}년 {month + 1}월
        </h2>
        <Link href={`/calendar?m=${ym(next)}`} className="btn btn--ghost">
          {next.getUTCMonth() + 1}월
          <ArrowRight />
        </Link>

        {/*
          🔴 ← → 한 달씩만 있었다. 8~9년을 다루겠다는 서비스에서 2026년 8월 → 2019년 4월이
            **88번 클릭**이었다(직접 세봤다). 달 입력 하나가 그 88번을 한 번으로 만든다.
          🔑 GET 폼이다 — month 입력의 값 형식(YYYY-MM)이 이 화면의 주소(?m=)와 같아서
            JS 없이 브라우저의 달 선택기가 그대로 점프가 된다.
        */}
        <form className="cal__jump" action="/calendar">
          <label className="cal__jump-label" htmlFor="cal-month">
            바로 가기
          </label>
          <input
            id="cal-month"
            className="field__input cal__jump-input"
            type="month"
            name="m"
            defaultValue={`${year}-${String(month + 1).padStart(2, "0")}`}
          />
          <button type="submit" className="btn btn--ghost">
            이동
          </button>
        </form>
      </nav>

      <table className="cal">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <tr key={row}>
              {cells.slice(row * 7, row * 7 + 7).map((day, i) => {
                if (!day) return <td key={i} className="cal__cell cal__cell--empty" />;

                const k = key(day);
                const items = byDay.get(k) ?? [];
                const covering = windows.filter((w) => coversDay(w, day));
                const when = describeAge(day, birth);
                const band = timeBand(when.scale);
                const isToday = k === key(today);

                return (
                  <td
                    key={i}
                    className={`cal__cell${isToday ? " cal__cell--today" : ""}`}
                    aria-current={isToday ? "date" : undefined}
                  >
                    <span className="cal__day">{day.getUTCDate()}</span>

                    {/*
                      🔑 검진 창은 **띠**로 깐다. 점으로 찍으면 "그날 가라"로 읽히는데
                        공단이 정한 것은 구간이지 날짜가 아니다.
                    */}
                    {covering.length > 0 ? (
                      <span
                        className={`cal__window cal__window--${covering[0].kind}`}
                        title={covering.map((w) => w.label).join(" · ")}
                      >
                        {covering.map((w) => w.label).join(" · ")}
                      </span>
                    ) : null}

                    {items.length > 0 ? (
                      <span className="cal__marks">
                        {items.map((a) => (
                          <Link
                            key={a.id}
                            href={`/artwork/${a.id}`}
                            className={band ? `cal__mark age--${band}` : "cal__mark"}
                            title={a.letters[0]?.body ?? "남긴 것"}
                          >
                            <span className="cal__mark-dot" aria-hidden />
                            <span className="cal__mark-text">{a.letters[0]?.body ?? "남긴 것"}</span>
                          </Link>
                        ))}
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/*
        🔑 이 달력이 **무엇을 안 담고 있는지**를 화면이 직접 말한다.
          없는 것을 침묵하면 사용자는 "여기 없으니 없는 일"이라고 읽는다.
      */}
      <section className="cal__note">
        <h2 className="cal__note-title">이 달력이 담지 않은 것</h2>
        <p>
          <strong>예방접종 일정은 여기 없습니다.</strong> 질병관리청의 표준 예방접종 일정표를
          직접 확인하지 못했고, 국가예방접종 일정은 해마다 바뀝니다. 틀린 접종 시기를 띄우는
          것보다 없는 편이 낫다고 판단했습니다.
        </p>
        <p>
          산전진찰은 <strong>간격만</strong> 보여줍니다. 출처(질병관리청 국가건강정보포털)가 정한
          것이 간격이고, 실제 방문일은 병원과 정합니다. 앱이 날짜를 만들지 않습니다.
        </p>
        <p className="cal__source">
          검진 구간 출처: 국민건강보험공단 「영유아 건강검진 안내」 · 산전진찰 간격 출처:
          질병관리청 국가건강정보포털 「정상임신관리」
        </p>
      </section>

      {windows.length === 0 ? (
        <p className="cal__note-empty">
          태어난 날을 넣으면 <Link href="/child">영유아 건강검진 창</Link>이 이 달력에
          같이 표시됩니다.
        </p>
      ) : null}

      {/* 지나간 창과 앞으로의 창을 한 번에 보는 목록. 달력은 한 달만 보여준다. */}
      {windows.length > 0
        ? (() => {
            /*
              🔴 열두 줄을 전부 펴놨었다. 시드의 아이(만 7세)는 창이 다 지나서
                **"지남" 열두 줄짜리 벽**이 됐다 — 같은 상태가 반복되는 목록은 정보가 아니라 소음이다.
              🔑 지금 볼 일이 있는 창(열려 있음·아직)만 펴고, 지난 창은 접는다.
                숨기지 않는다 — <details>라 한 번 누르면 다 나오고 JS도 없다.
                "지나갔다"는 사실 자체는 요약 줄이 개수로 말한다.
            */
            const rows = windows.map((w) => ({ w, state: windowState(w, today) }));
            const current = rows.filter((r) => r.state !== "past");
            const past = rows.filter((r) => r.state === "past");
            const row = ({ w, state }: (typeof rows)[number]) => (
              <li key={`${w.kind}-${w.round}`} className={`cal__all-row cal__all-row--${state}`}>
                <span className="cal__all-label">{w.label}</span>
                <span className="cal__all-when">
                  {key(w.start).replace(/-/g, ".")} ~ {key(w.end).replace(/-/g, ".")}
                </span>
                <span className="cal__all-state">
                  {state === "open" ? "열려 있음" : state === "future" ? "아직" : "지남"}
                </span>
              </li>
            );
            return (
              <section className="cal__all">
                <h2 className="cal__note-title">검진 창 전체</h2>
                {current.length > 0 ? (
                  <ul className="cal__all-list">{current.map(row)}</ul>
                ) : (
                  <p className="cal__all-none">지금 열려 있거나 다가오는 검진 창은 없습니다.</p>
                )}
                {past.length > 0 ? (
                  <details className="cal__past">
                    <summary className="cal__past-toggle">지난 창 {past.length}개 보기</summary>
                    <ul className="cal__all-list">{past.map(row)}</ul>
                  </details>
                ) : null}
              </section>
            );
          })()
        : null}
    </div>
  );
}
