"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { isOrderNo } from "@/lib/order-no";
import { nextStatus, STATUS, type OrderStatus } from "@/lib/order-status";

/**
 * 주문 상태를 다음 단계로.
 *
 * 🔑 Order.status 갱신과 OrderEvent 추가는 반드시 한 트랜잭션이다.
 *   따로 쓰면 둘 사이에서 실패했을 때 **목록과 상세가 서로 다른 말을 한다** —
 *   목록은 "인쇄 중"인데 상세의 이력에는 인쇄로 넘어간 기록이 없는 주문이 생긴다.
 *   그 상태는 화면을 고쳐서 감출 수 있는 게 아니라 데이터가 이미 모순인 것이다.
 *
 *   Order.status를 따로 둔 것이 목록을 가볍게 하려는 선택이었으므로(schema.prisma),
 *   그 대가로 "둘을 같이 쓴다"는 책임이 생긴다. 여기가 그 책임을 지는 자리다.
 *
 * 🔑 되돌리기가 없다 — 전진만 한다.
 *   실제 공정에서는 되돌아가는 일이 있다(인쇄 사고, 주소 오류로 배송 회수).
 *   그런데 화면에서 임의로 되돌릴 수 있게 하면 **"누가 왜 되돌렸나"를 설명할 수 없다.**
 *   그 답을 담을 자리(사유·담당자)가 스키마에 없고, 지금 만들 근거도 없다.
 *   "설명 못 하는 상태는 만들지 않는다"(schema.prisma의 OrderStatus)와 같은 원칙이다.
 */

export type AdvanceState = { error?: string };

export async function advanceOrder(_prev: AdvanceState, formData: FormData): Promise<AdvanceState> {
  const orderNo = String(formData.get("orderNo") ?? "");
  if (!isOrderNo(orderNo)) return { error: "주문번호를 확인할 수 없습니다." };

  /**
   * 화면이 보고 있던 상태를 같이 받는다.
   *
   * 🔑 왜 "다음 단계로"가 아니라 "이 상태에서 다음 단계로"인가
   *   두 창을 열어두고 양쪽에서 누르면, 서버가 매번 현재 상태를 읽어 다음으로 보내는 방식은
   *   **접수 → 인쇄 → 배송을 두 번의 클릭으로 통과시킨다.** 사용자는 한 번씩만 눌렀는데
   *   두 단계가 지나간다. 화면이 보고 있던 상태를 조건에 넣으면 두 번째 클릭이 아무 일도 하지 않는다.
   */
  const from = String(formData.get("from") ?? "") as OrderStatus;
  if (!(from in STATUS)) return { error: "현재 상태를 확인할 수 없습니다." };

  const to = nextStatus(from);
  if (!to) return { error: "마지막 단계입니다. 더 진행할 곳이 없습니다." };

  const prisma = getPrisma();

  const result = await prisma.$transaction(async (tx) => {
    /**
     * where에 status: from을 건다. 그 사이에 다른 요청이 이미 옮겼으면 0건이 갱신된다.
     * 조회해서 확인하고 갱신하는 대신 **갱신 자체를 조건부로** 만든 것이다 —
     * 조회와 갱신 사이는 항상 비어 있다.
     */
    const updated = await tx.order.updateMany({
      where: { orderNo, status: from },
      data: { status: to },
    });

    if (updated.count === 0) return { moved: false };

    const order = await tx.order.findUnique({ where: { orderNo }, select: { id: true } });
    if (!order) throw new Error("주문이 사라졌습니다");

    await tx.orderEvent.create({ data: { orderId: order.id, status: to } });
    return { moved: true };
  });

  if (!result.moved) {
    // 이미 누군가 옮겼다. 오류로 보이게 할 이유가 없다 — 원하던 결과는 이미 이뤄져 있다.
    revalidatePath(`/orders/${orderNo}`);
    return {};
  }

  /**
   * 목록과 상세가 둘 다 이 주문을 보여준다. 상세만 새로 그리면
   * 목록으로 돌아갔을 때 옛 상태가 남아 "방금 바꿨는데 안 바뀐 것처럼" 보인다.
   */
  revalidatePath(`/orders/${orderNo}`);
  revalidatePath("/orders");
  return {};
}
