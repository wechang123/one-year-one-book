import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { getNow } from "@/lib/now";
import { describeAge, describeGap, timeBand, type TimeBand } from "@/lib/age";
import { SaidBy, emptyQuoteText } from "./artwork/said-by";
import { Camera } from "./icons";
import { DemoResetButton } from "./demo/reset-button";

/**
 * 타임라인 — v2의 첫 화면.
 *
 * ═══════════════════════════════════════════════════════════
 * 🔴 v1의 첫 화면은 **격자**였다. 그 격자는 `/grid`로 옮겼다.
 *
 *   격자는 **한 해 안에서 고르는 화면**이다. 열두 칸이 나란히 있고 눈이 훑는다.
 *   그런데 이 서비스가 실제로 다루는 것은 **8~9년**이고, 격자는 그 길이를 못 보여준다.
 *   해 제목을 얹어 나눠봐도(v1 #58) 여전히 **덩어리 넷이 위아래로 쌓인 것**이지
 *   임신에서 초등까지 이어진 한 줄이 아니었다.
 *
 * 🔑 타임라인이 첫 화면인 이유
 *   이 앱의 주인공은 **시간**이다. 같은 아이가 임신 14주였다가 만 7세가 되는 것,
 *   그 사이에 실물이 하나씩 놓이는 것 — 그게 부모가 8년 뒤에 보고 싶은 모양이다.
 *   격자·달력·말은 **그 축을 잘라 보는 방법들**이고, 사이드바에서 나란히 고른다.
 *
 * 🔑 위가 오래된 것이고 아래로 내려올수록 최근이다. 홈(v1)과 반대다.
 *   홈은 방금 등록한 것을 **확인하러** 오는 화면이라 최신이 위였다.
 *   타임라인은 **읽는** 화면이다. 자란 것을 보려면 자란 방향으로 읽혀야 한다.
 */

export const dynamic = "force-dynamic";

/** 띠가 바뀌는 자리에 놓는 표. 축이 여기서 단위를 갈아탄다. */
const BAND_MARK: Record<TimeBand, { title: string; note: string }> = {
  before: { title: "태어나기 전", note: "주차로 센다" },
  infant: { title: "태어났다", note: "날과 개월로 센다" },
  child: { title: "두 돌", note: "이제 나이로 센다" },
};

export default async function TimelinePage() {
  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });

  const artworks = await prisma.artwork.findMany({
    where: profile ? { profileId: profile.id } : undefined,
    // 🔑 오래된 것부터. 이 화면은 걸어 내려오는 화면이다.
    orderBy: [{ madeOn: "asc" }, { createdAt: "asc" }],
    select: { id: true, childQuote: true, quoteBy: true, madeOn: true },
  });

  const birth = { dueOn: profile?.dueOn ?? null, bornOn: profile?.bornOn ?? null };
  const owner = profile?.childName ?? null;

  /*
    🔑 `madeOn`이 전부 UTC 자정이라 오늘도 같은 규칙으로 깎는다.
      지역 시간 그대로 빼면 하루가 밀어서 `1일`이 `0일`이 되기도 한다.
  */
  const now = getNow();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  if (artworks.length === 0) {
    return (
      <div className="page">
        <header className="masthead">
          <div className="masthead__text">
            <h1 className="masthead__title">아이가 남긴 것을, 그때의 말과 함께.</h1>
            <p className="masthead__lede">
              초음파 사진부터 상장까지, 한 해가 지나면 한 권으로 묶습니다.
              <strong> 그래서 실물은 마음 편히 정리하셔도 됩니다.</strong>
            </p>
          </div>
        </header>

        <div className="blank">
          <h2 className="blank__title">아직 남긴 것이 없어요.</h2>
          <p className="blank__body">
            아이가 그림을 내밀면, 병원에서 초음파 사진을 받아 나오면, <strong>그 자리에서</strong>
            사진을 찍고 <strong>그때의 말</strong>을 그대로 적어두세요. 그 말은 그 자리에서 안
            받으면 영영 얻을 수 없습니다.
          </p>
          <Link href="/artwork/new" className="btn">
            <Camera />첫 한 점 남기기
          </Link>
        </div>
      </div>
    );
  }

  /*
    🔑 띠가 바뀌는 지점을 미리 찾아둔다. 렌더 중에 "앞 항목과 띠가 다른가"를 보면
      될 것 같지만, 그러면 **생일을 안 넣어 띠가 전부 null인 경우**에 표가 하나도
      안 나오는 대신 조건문이 여기저기 흩어진다. 자리를 먼저 정하고 그 다음에 그린다.
  */
  const rows = artworks.map((a) => {
    const when = describeAge(a.madeOn, birth);
    return { ...a, when, band: timeBand(when.scale) };
  });

  const marks = new Map<string, TimeBand>();
  let previous: TimeBand | null = null;
  for (const row of rows) {
    if (row.band && row.band !== previous) marks.set(row.id, row.band);
    previous = row.band ?? previous;
  }

  const first = rows[0];
  const last = rows[rows.length - 1];

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__text">
          <p className="masthead__meta">
            {owner ? `${owner}의 기록 · ` : null}
            {first.when.scale === "none"
              ? `${artworks.length}점`
              : `${first.when.label}부터 ${last.when.label}까지 ${artworks.length}점`}
          </p>
          <h1 className="masthead__title">타임라인</h1>
          <p className="masthead__lede">
            위에서 아래로 <strong>자란 순서</strong>입니다. 축이 주차에서 개월로, 개월에서
            나이로 바뀝니다.
          </p>
        </div>
      </header>

      <ol className="tl">
        {rows.map((row) => {
          const mark = marks.get(row.id);
          return (
            <li key={row.id} className="tl__item">
              {/*
                🔑 띠가 바뀌는 자리에만 표가 선다. 이 표가 이 화면의 전부다 —
                  **부르는 단위가 갈아타는 순간**이 아이가 자란 순간이라서다.
              */}
              {mark ? (
                <p className={`tl__mark age--${mark}`}>
                  <span className="tl__mark-title">{BAND_MARK[mark].title}</span>
                  <span className="tl__mark-note">{BAND_MARK[mark].note}</span>
                </p>
              ) : null}

              <Link
                href={`/artwork/${row.id}`}
                className={row.band ? `tl__row tl__row--${row.band}` : "tl__row"}
              >
                <span className="tl__dot" aria-hidden />

                <span className="tl__thumb">
                  <img src={`/api/photo/${row.id}`} alt="" loading="lazy" decoding="async" />
                </span>

                <span className="tl__body">
                  <span className="tl__when">
                    {row.band ? (
                      <span className={`tl__age age--${row.band}`}>{row.when.label}</span>
                    ) : null}
                    <time dateTime={row.madeOn.toISOString()}>{formatMadeOn(row.madeOn)}</time>
                  </span>

                  {row.childQuote ? (
                    <span className="tl__quote">
                      <SaidBy by={row.quoteBy} />
                      {row.childQuote}
                    </span>
                  ) : (
                    <span className="tl__quote tl__quote--empty">
                      {emptyQuoteText(row.quoteBy)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/*
        🔴 전에는 여기가 `여기까지가 지금입니다` 한 줄이었다. 축이 **마지막 기록에서 뚝 끊겼다.**
          이 서비스는 *"손에 실물이 들려 있는 순간"*이 트리거라, **그 순간이 한동안 없었다는
          사실 자체**가 사용자가 알아야 할 것이다. 나중에 되짚을 때 가장 아쉬운 자리가 거기다.

        ⛔ 그렇다고 **재촉 장치를 만들지 않는다.** 붉은색도, 느낌표도, `N일째 비어 있습니다`도 없다.
          `주기·마감·창 규칙을 만들지 않는다`가 이 자리에서 가장 어기기 쉽다.
          화면은 **얼마나 지났는지만 세고 판단은 하지 않는다.**

        🔑 그래서 그리는 것은 **점선 한 토막**이다. 실선이면 기록이 이어진 것처럼 읽히고,
          없으면 축이 마지막 기록에서 끝난 것처럼 읽힌다. 점선은 *"여기는 비어 있다"*만 말한다.
      */}
      {(() => {
        const gap = describeGap(last.madeOn, today);
        const nowWhen = describeAge(today, birth);
        const nowBand = timeBand(nowWhen.scale);
        return (
          <div className="tl__tail">
            <p className="tl__gap">
              {gap ? (
                <>
                  마지막으로 남긴 뒤로 <strong>{gap}</strong>
                </>
              ) : (
                "오늘 남기셨습니다"
              )}
            </p>

            <p className={nowBand ? `tl__today tl__today--${nowBand}` : "tl__today"}>
              <span className="tl__dot" aria-hidden />
              <span className="tl__today-body">
                <span className="tl__today-label">오늘</span>
                {nowBand ? (
                  <span className={`tl__age age--${nowBand}`}>{nowWhen.label}</span>
                ) : null}
              </span>
            </p>

            <Link href="/artwork/new" className="btn btn--ghost tl__end-btn">
              <Camera />한 점 더 남기기
            </Link>
          </div>
        );
      })()}

      {/*
        🔴 이 구역은 v1의 홈(지금의 `/grid`)에 있었다. 첫 화면이 바뀌면서 따라왔다.
          v1에서 이 자리를 고른 근거가 *"처음 여는 사람에게는 필요하고 주 사용자에게는
          필요 없는 기능이라, 찾으면 보이되 먼저 보이지는 않아야 한다"*였는데,
          **첫 화면의 맨 아래**라는 조건이 그 근거의 전부다. 화면이 바뀌었으니 자리도 따라간다.

          안 옮겼으면 `/grid`를 안 들른 사람은 이걸 영영 못 본다 —
          그리고 되돌릴 수 없으면 아무도 위의 버튼을 안 눌러본다.
      */}
      <footer className="demo">
        <p className="demo__lede">
          마음껏 등록하고 고치고 주문해 보세요. 언제든 처음 상태로 되돌릴 수 있습니다.
        </p>
        <DemoResetButton />
      </footer>
    </div>
  );
}
