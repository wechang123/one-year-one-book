import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { STATUS, stepOf, TOTAL_STEPS, type OrderStatus } from "@/lib/order-status";
import { formatDay } from "@/lib/date";
import { ArrowLeft, BookPlus } from "../icons";

/**
 * 주문 목록.
 *
 * 🔑 조인 없이 Order.status만 읽는다.
 *   OrderEvent에 이력이 다 있는데도 Order에 status 칸을 따로 둔 이유가 이것이다
 *   (schema.prisma의 Order.status). 이력만 있으면 목록 10건마다 최신 이벤트를 찾아야 한다.
 *   대신 상태를 바꾸는 경로를 한 곳으로 몰아 둘이 어긋나지 않게 한다(상태 변경은 한 트랜잭션이다).
 *
 *   즉 이 화면이 빠른 것은 우연이 아니라 스키마가 그렇게 생긴 결과다.
 */
export const dynamic = "force-dynamic";

/**
 * 한 번에 보여주는 최대 건수.
 *
 * 🔑 LIMIT이 없으면 "지금 잘 도는 것"이 나중에 안 도는 이유가 된다.
 *   주문은 지우는 화면이 없어서 **줄지 않고 쌓이기만 한다.**
 *   페이지 나누기를 만들 근거는 아직 없지만(주문이 한 자릿수다),
 *   상한이 없는 조회를 남겨두는 것과는 다른 이야기다.
 *   대신 잘렸다는 사실을 화면이 숨기지 않는다 — 아래 tally를 보라.
 */
const PAGE_SIZE = 50;

export default async function OrdersPage() {
  const prisma = getPrisma();

  /**
   * 🔑 아이를 먼저 찾고 그 아이의 주문만 읽는다.
   *   전에는 where가 없어 **모든 아이의 주문**을 가져오고 있었다.
   *   app/page.tsx에서 정확히 같은 문제를 고치고 그 이유를 주석으로 길게 남겨뒀는데,
   *   Lv2 새 화면에서 그대로 재발했다. **고친 기록이 다음 화면으로 옮겨가지 않았다.**
   */
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: profile ? { collection: { profileId: profile.id } } : undefined,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        orderNo: true,
        status: true,
        recipientName: true,
        createdAt: true,
        // 어느 책의 주문인지는 목록에서도 필요하다. 제목이 없으면 "무엇을 주문했더라"가 남는다.
        collection: { select: { year: true, title: true } },
      },
    }),
    prisma.order.count({
      where: profile ? { collection: { profileId: profile.id } } : undefined,
    }),
  ]);

  return (
    <div className="page">
      <nav className="detail__nav">
        <Link href="/" className="btn btn--ghost">
          <ArrowLeft />
          타임라인
        </Link>
      </nav>

      <header className="masthead">
        <div className="masthead__text">
          <h1 className="masthead__title">주문</h1>
          <p className="masthead__lede">넣으신 주문과 지금 어디까지 왔는지입니다.</p>
        </div>
      </header>

      {orders.length === 0 ? (
        /*
         * 🔑 주문이 0건인 화면이 무엇을 말할지를 먼저 정했다.
         *   "주문이 없습니다"로 끝내면 사용자는 여기서 할 일이 없다.
         *   이 서비스에서 주문이 없다는 건 **아직 책을 안 묶었거나 묶고 주문을 안 한 것**이라,
         *   그 앞 단계로 돌려보내는 것이 맞다.
         */
        <div className="blank">
          <h2 className="blank__title">아직 넣으신 주문이 없어요.</h2>
          <p className="blank__body">
            한 해에 남긴 것을 <strong>책으로 묶으면</strong> 그 책을 주문할 수 있습니다.
          </p>
          <Link href="/" className="btn">
            <BookPlus />
            책 묶으러 가기
          </Link>
        </div>
      ) : (
        <>
          {/* 잘렸다는 사실을 숨기지 않는다. 숨기면 "주문이 사라졌다"로 읽힌다. */}
          <p className="tally">
            주문 {total}건
            {total > orders.length ? ` · 최근 ${orders.length}건만 보입니다` : null}
          </p>

          <ul className="orders">
            {orders.map((order) => {
              const s = STATUS[order.status as OrderStatus];
              return (
                <li key={order.orderNo}>
                  <Link href={`/orders/${order.orderNo}`} className="order">
                    <div className="order__head">
                      {/*
                        주문번호를 첫 줄에 둔다. 문의할 때 대는 값이고,
                        목록에서 "내가 말한 그 주문"을 찾는 열쇠이기도 하다.
                      */}
                      <span className="order__no">{order.orderNo}</span>
                      <span className={`badge badge--${order.status.toLowerCase()}`}>{s.label}</span>
                    </div>

                    <p className="order__book">
                      {order.collection.title} · {order.collection.year}년
                    </p>

                    <p className="order__meta">
                      {order.recipientName} 님께 · {formatDay(order.createdAt)} 주문 ·{" "}
                      {stepOf(order.status as OrderStatus)}/{TOTAL_STEPS}단계
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
