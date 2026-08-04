import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { formatMoment } from "@/lib/date";
import { isOrderNo } from "@/lib/order-no";
import { ORDER_STATUSES, STATUS, stepOf, TOTAL_STEPS, type OrderStatus } from "@/lib/order-status";
import { AdvanceButton } from "./advance";
import { ArrowLeft } from "../../icons";

/**
 * 주문 상세.
 *
 * 🔑 이 화면이 답하는 질문은 "지금 어느 상태인가"가 아니다.
 *   그건 목록이 이미 답했다. 여기서 사용자가 알고 싶은 건 **"언제부터 그 상태였나"**다 —
 *   *"인쇄 중이라는데 어제부터인가 방금부터인가"*가 기다릴지 전화할지를 가른다.
 *   현재 상태만 덮어썼으면 그 답이 사라진다. OrderEvent를 따로 둔 이유가 이것이다
 *   (schema.prisma의 OrderEvent).
 *
 * 🔑 주소창에 orderNo를 쓴다
 *   cuid를 쓰면 주소를 보고 어느 주문인지 알 수 없다. orderNo는 사람이 부를 수 있게
 *   만든 값이라 주소에서도 읽힌다 — 전화로 불러준 번호를 그대로 주소창에 넣어볼 수 있다.
 */
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;

  // 형식이 안 맞으면 DB까지 가지 않는다.
  if (!isOrderNo(orderNo)) notFound();

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: {
      orderNo: true,
      status: true,
      recipientName: true,
      recipientPhone: true,
      address: true,
      createdAt: true,
      collection: { select: { year: true, title: true } },
      events: {
        // 시간순이다. 최신순으로 뒤집으면 "어떤 순서로 흘러왔나"가 안 읽힌다.
        orderBy: { occurredAt: "asc" },
        select: { id: true, status: true, occurredAt: true, note: true },
      },
    },
  });

  if (!order) notFound();

  const current = order.status as OrderStatus;
  const now = STATUS[current];

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href="/orders" className="btn btn--ghost">
          <ArrowLeft />
          주문 목록
        </Link>
      </nav>

      <header className="form__head">
        <p className="masthead__meta">주문번호 {order.orderNo}</p>
        <h1 className="form__title">{order.collection.title}</h1>
        <p className="form__lede">{order.collection.year}년 · 한 해가 한 권</p>
      </header>

      {/* 지금 상태를 한 번만, 크게. 목록의 배지와 같은 말을 쓴다(lib/order-status.ts). */}
      <section className="status" aria-label="현재 상태">
        <p className="status__now">
          <span className={`badge badge--${current.toLowerCase()}`}>{now.label}</span>
          <span className="status__step">
            {stepOf(current)} / {TOTAL_STEPS}단계
          </span>
        </p>
        <p className="status__detail">{now.detail}</p>

        {/* 남은 단계를 흐리게 보여준다. 끝이 어디인지 모르면 기다리는 시간이 더 길게 느껴진다. */}
        <ol className="steps">
          {ORDER_STATUSES.map((s) => (
            <li
              key={s}
              className={`steps__item${s === current ? " steps__item--now" : ""}${
                stepOf(s) < stepOf(current) ? " steps__item--done" : ""
              }`}
            >
              {STATUS[s].label}
            </li>
          ))}
        </ol>
      </section>

      <AdvanceButton orderNo={order.orderNo} from={current} />

      <section aria-labelledby="hist-h">
        <h2 className="section__h" id="hist-h">
          지나온 기록
        </h2>
        <ol className="events">
          {order.events.map((e) => (
            <li key={e.id} className="events__item">
              <time className="events__at" dateTime={e.occurredAt.toISOString()}>
                {formatMoment(e.occurredAt)}
              </time>
              <span className="events__what">{STATUS[e.status as OrderStatus].done}</span>
              {e.note ? <span className="events__note">{e.note}</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ship-h">
        <h2 className="section__h" id="ship-h">
          받는 곳
        </h2>
        <dl className="detail__meta">
          <dt>받는 분</dt>
          <dd>{order.recipientName}</dd>
          <dt>연락처</dt>
          <dd>{order.recipientPhone}</dd>
          <dt>주소</dt>
          <dd>{order.address}</dd>
        </dl>
      </section>

      <p className="notice">결제와 배송은 아직 연결되어 있지 않습니다. 실제 제작은 이뤄지지 않습니다.</p>
    </div>
  );
}
