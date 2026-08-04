"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { advanceOrder, type AdvanceState } from "./actions";
import { STATUS, type OrderStatus } from "@/lib/order-status";
import { ArrowRight } from "../../icons";

const INITIAL: AdvanceState = {};

/**
 * 다음 단계로 넘기는 버튼.
 *
 * 🔑 이 버튼이 무엇인지 화면이 밝힌다.
 *   실제 서비스에서 주문 상태는 **인쇄 공정 쪽에서** 바뀐다. 주문한 부모가 누르는 것이 아니다.
 *   그런데 이 저장소에는 공정도 관리자 화면도 없다. 그러면 상태 전이는
 *   **아무도 볼 수 없는 기능**이 된다 — 만들어놓고 동작을 보여줄 수 없다.
 *
 *   그래서 이 버튼을 뒀고, **제품 기능인 척하지 않는다.** 밝히지 않으면
 *   "주문한 사람이 자기 주문을 배송 중으로 바꿀 수 있는 서비스"로 읽힌다.
 */
export function AdvanceButton({ orderNo, from }: { orderNo: string; from: OrderStatus }) {
  const [state, formAction] = useActionState(advanceOrder, INITIAL);
  const to = from === "RECEIVED" ? "PRINTING" : from === "PRINTING" ? "SHIPPING" : null;

  if (!to) {
    return (
      <p className="notice">
        마지막 단계입니다. <strong>배송완료 상태는 만들지 않았습니다.</strong> 배송사 연동 없이는
        누가 언제 그 상태로 바꾸는지 설명할 수 없기 때문입니다.
      </p>
    );
  }

  return (
    <form action={formAction} className="advance">
      <input type="hidden" name="orderNo" value={orderNo} />
      {/* 화면이 보고 있던 상태를 같이 보낸다. 두 창에서 눌렀을 때 두 단계가 지나가지 않게. */}
      <input type="hidden" name="from" value={from} />

      {state.error ? (
        <p className="form__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <p className="advance__note">
        이 버튼은 <strong>상태가 바뀌는 것을 확인할 수 있게 둔 장치</strong>이지 제품 기능이 아닙니다.
        실제로는 인쇄 공정 쪽에서 바뀝니다.
      </p>

      <SubmitButton label={`${STATUS[to].label}(으)로 넘기기`} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "바꾸는 중…" : label}
      <ArrowRight />
    </button>
  );
}
