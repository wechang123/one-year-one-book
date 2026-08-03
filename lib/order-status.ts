/**
 * 주문 상태를 사용자 말로 옮기는 자리.
 *
 * 🔑 왜 상수 하나에 모으나
 *   상태는 세 화면에 나온다 — 주문 목록 · 주문 상세 · 상태 변경 버튼.
 *   화면마다 문구를 적으면 한 곳을 고칠 때 나머지가 남는다.
 *   그러면 목록에서는 "인쇄 중"인데 상세에서는 "제작 중"인 주문이 생기고,
 *   사용자는 그게 같은 상태인지 다른 상태인지 알 방법이 없다.
 *
 * 🔑 RECEIVED·PRINTING·SHIPPING을 화면에 그대로 내보내지 않는다
 *   그건 DB의 값이지 사람에게 하는 말이 아니다. 부모가 알고 싶은 건 영어 상수가 아니라
 *   **"지금 내 책이 어디쯤 있나"**다. 그래서 라벨과 함께 한 줄 설명을 둔다 —
 *   상태 이름만으로는 "그래서 나는 뭘 기다리면 되나"에 답이 안 된다.
 *
 * 🔑 배송완료가 없다
 *   요구가 세 단계다. 넷째 단계는 배송사 연동 없이 **누가 언제 바꾸는지 설명할 수 없다.**
 *   설명 못 하는 상태는 만들지 않는다(schema.prisma의 OrderStatus).
 */

export const ORDER_STATUSES = ["RECEIVED", "PRINTING", "SHIPPING"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * 밖에서 들어온 문자열이 상태인가.
 *
 * 🔑 `value in STATUS`로 검사하면 안 된다.
 *   `in`은 프로토타입 체인까지 훑어서 `toString`·`constructor`·`valueOf`가 전부 통과한다.
 *   허용 목록이 배열로 있으니 그걸 쓴다 — **허용한 것만 통과하는 게 허용 목록의 일이다.**
 */
export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

type StatusInfo = {
  /** 화면에 쓰는 이름. */
  label: string;
  /** 지금 무슨 일이 일어나는 중인지. 상태 이름만으로는 부족해서 붙였다. */
  detail: string;
  /** 이 상태로 넘어갔을 때 이력에 남길 말. 과거형이다 — 이미 일어난 일이라서. */
  done: string;
};

export const STATUS: Record<OrderStatus, StatusInfo> = {
  RECEIVED: {
    label: "접수됨",
    detail: "주문이 들어왔습니다. 곧 인쇄에 들어갑니다.",
    done: "주문이 접수되었습니다",
  },
  PRINTING: {
    label: "인쇄 중",
    detail: "책을 만들고 있습니다.",
    done: "인쇄를 시작했습니다",
  },
  SHIPPING: {
    label: "배송 중",
    detail: "책이 출발했습니다.",
    done: "배송을 시작했습니다",
  },
};

/**
 * 다음 단계. 마지막이면 null.
 *
 * 🔑 되돌리기가 없다 — 전진만 한다.
 *   실제 공정에서는 되돌아가는 일이 있다(인쇄 사고, 주소 오류).
 *   그런데 화면에서 아무나 되돌릴 수 있게 하면 **"누가 왜 되돌렸나"를 설명할 수 없다.**
 *   그 답을 담을 자리(사유·담당자)가 스키마에 없고, 지금 만들 근거도 없다.
 *   설명 못 하는 상태는 만들지 않는다는 원칙을 여기에도 적용한다.
 */
export function nextStatus(current: OrderStatus): OrderStatus | null {
  const i = ORDER_STATUSES.indexOf(current);
  return i >= 0 && i < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[i + 1] : null;
}

/** 진행률 표시에 쓴다. 1부터 센다 — 사람은 0단계라고 세지 않는다. */
export function stepOf(status: OrderStatus): number {
  return ORDER_STATUSES.indexOf(status) + 1;
}

export const TOTAL_STEPS = ORDER_STATUSES.length;
