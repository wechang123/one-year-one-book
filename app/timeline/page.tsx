import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatMadeOn } from "@/lib/date";
import { getNow } from "@/lib/now";
import { couldHaveSpoken, describeAge, describeGap, timeBand, type TimeBand } from "@/lib/age";
import { letterTiming } from "@/lib/letter";
import { SaidBy, emptyQuoteText } from "../artwork/said-by";
import { Camera } from "../icons";

/**
 * 타임라인 — 한 줄로 읽는 화면. (v2~v4 첫 화면이었다가 홈을 모아보기에 넘겼다)
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
    /*
      🔴 사진의 **치수만** 같이 읽는다. 바이트는 안 읽는다 — `<img>`가 /api/photo로 따로 받는다.
        v3.1에서 사진을 크게 키우면서 틀의 비율 고정을 뺐는데,
        그러면 **사진이 도착하기 전에 칸 높이가 0**이 된다. `loading="lazy"`와 겹치면
        칸이 접힌 채로 화면에 남는다 — 실제로 점만 남은 화면이 나왔다.
        이 저장소는 v1에서 이미 같은 것을 배웠다(`.card__frame`의 비율 고정).
        거기는 정사각으로 풀었고 여기는 **원본 비율**로 푼다.
    */
    select: {
      id: true,
      madeOn: true,
      /**
       * 🔑 편지는 쓴 날 순이다(lib/letter.ts). 타임라인은 읽는 화면이라
       *   한 점에 도착한 편지들도 도착한 순서로 읽혀야 한다.
       */
      letters: {
        orderBy: [{ writtenOn: "asc" }, { createdAt: "asc" }],
        select: { id: true, body: true, writtenBy: true, writtenOn: true },
      },
      photo: { select: { width: true, height: true } },
    },
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

              {/*
                🔴 세 칸(점·썸네일 56px·글)짜리 가로 줄이었다. 세로로 세웠다.
                  **사진이 56px이고 그 옆 글자가 더 컸다.** 이 서비스가 받아두는 것이
                  사진인데 화면에서 사진이 가장 작았다 — 그러면 그건 사진 목록이 아니라
                  **사진이 붙은 활동 로그**다.

                🔑 순서: 언제 → 무엇 → 뭐라고 했나.
                  라벨이 위에 있는 이유는 **사진을 보기 전에 언제인지 알아야** 하기 때문이다.
                  말은 사진을 본 뒤에 온다 — 아이가 그림을 내밀고 나서 말한 순서 그대로다.
              */}
              <Link
                href={`/artwork/${row.id}`}
                className={row.band ? `tl__row tl__row--${row.band}` : "tl__row"}
              >
                <span className="tl__when">
                  <span className="tl__dot" aria-hidden />
                  {row.band ? (
                    <span className={`tl__age age--${row.band}`}>{row.when.label}</span>
                  ) : null}
                  <time dateTime={row.madeOn.toISOString()}>{formatMadeOn(row.madeOn)}</time>
                </span>

                <span
                  className="tl__figure"
                  /*
                    🔑 사진의 원본 비율을 CSS 변수로 넘긴다. 틀이 이 비율로 **먼저 자리를 잡고**
                      사진이 그 안에 들어온다. 치수를 모르는 옛 기록은 4/3으로 떨어진다.
                  */
                  style={
                    row.photo?.width && row.photo?.height
                      ? ({ "--ar": `${row.photo.width} / ${row.photo.height}` } as React.CSSProperties)
                      : undefined
                  }
                >
                                    <img src={`/api/photo/${row.id}`} alt="" loading="lazy" decoding="async" />
                </span>

                {row.letters.length > 0 ? (
                  <span className="tl__letters">
                    {row.letters.map((letter) => {
                      /*
                        🔑 나중에 도착한 편지에만 간격이 붙는다 — "7년 뒤에 쓴 편지".
                          그때 받은 말(쓴 날 = 만든 날)에는 아무 표식도 없다.
                          지금까지의 모든 말이 그랬으므로, 표식은 간격이 생겼을 때만 정보다.
                      */
                      const timing = letterTiming(row.madeOn, letter.writtenOn);
                      return (
                        <span key={letter.id} className="tl__quote">
                          {timing ? <span className="letter__timing">{timing} 쓴 편지</span> : null}
                          <SaidBy by={letter.writtenBy} />
                          {letter.body}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  /*
                    🔑 빈 문구의 말투는 이제 저장값이 아니라 시기에서 나온다.
                      quoteBy 컬럼이 있던 때는 그 값으로 "안 물어봤어요/안 적었어요"를 갈랐는데,
                      편지가 0통이면 물어볼 값 자체가 없다. 앱이 실제로 아는 사실 —
                      **그때 말을 할 수 있었는가** — 로 가른다. 저장값보다 정직하다.
                  */
                  <span className="tl__quote tl__quote--empty">
                    {emptyQuoteText(couldHaveSpoken(row.madeOn, birth) ? "CHILD" : "PARENT")}
                  </span>
                )}
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
        🔴 여기 [데모 초기화] 푸터가 있었다. 홈이 모아보기로 바뀌면서 따라갔다 —
          이 자리를 고른 근거가 "첫 화면의 맨 아래"였으니, 첫 화면이 옮겨지면 같이 옮겨진다.
      */}
    </div>
  );
}
