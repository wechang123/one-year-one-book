"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseYear } from "@/lib/book";
import { makeOrderNo } from "@/lib/order-no";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { getNow } from "@/lib/now";

/**
 * 주문 넣기.
 *
 * 🔑 이 화면이 받는 것은 세 가지뿐이다 — 받는 사람 · 연락처 · 주소.
 *   결제·배송 연동·회원 인증은 범위 밖이고, 실제 책을 만들지도 않는다.
 *   여기서 하려는 건 **"주문을 기록하고 그 흐름을 관리하는 것"**까지다.
 *   그래서 가격·쪽수·배송예정일 칸이 없다 — 제작 사양이 정해지지 않았고,
 *   지어내면 화면은 채워지지만 근거가 없다(schema.prisma의 Order).
 */

const NAME_MAX = 40;
const ADDRESS_MIN = 5;
const ADDRESS_MAX = 200;

/**
 * 같은 내용의 주문이 이 시간 안에 또 들어오면 **같은 주문으로 본다.**
 *
 * 🔑 왜 시간 창인가
 *   중복 클릭·새로고침으로 인한 재전송은 **몇 초 안에** 일어난다.
 *   반면 "할머니 드릴 한 권 더"는 같은 주소라도 그 자리에서 연달아 넣는 일이 아니다.
 *   그래서 짧은 창을 두면 사고는 막고 의도는 막지 않는다.
 *   책 한 권에 주문 여러 건은 스키마가 허용한다(Order에 unique가 없다) — 그걸 지키면서
 *   실수만 걸러내는 방법이다.
 */
const DEDUP_WINDOW_MS = 60_000;

/** 주문번호가 겹치면 다시 뽑는다. 31^4 중에서 겹칠 확률은 낮지만 0은 아니다. */
const ORDERNO_RETRIES = 5;

export type NewOrderState = {
  error?: string;
  field?: "recipientName" | "recipientPhone" | "address";
  /**
   * 🔑 사용자가 방금 친 값을 그대로 돌려보낸다.
   *   React 19는 폼 액션이 끝나면 **입력칸을 비운다.** 그게 기본 동작이다.
   *   등록 성공 뒤에는 맞는 동작이지만, **오류로 되돌아왔을 때는 재앙**이다 —
   *   주소까지 다 지워지고 처음부터 다시 치게 된다.
   *   되돌려준 값을 defaultValue로 다시 심어 "지웠다가 같은 값으로 채우는" 결과를 만든다.
   */
  values?: { recipientName: string; recipientPhone: string; address: string };
};

export async function createOrder(_prev: NewOrderState, formData: FormData): Promise<NewOrderState> {
  const year = parseYear(String(formData.get("year") ?? ""));

  const recipientName = String(formData.get("recipientName") ?? "").trim();
  // 연락처는 다듬기 전 값을 돌려준다. 사용자가 친 그대로 보여야 어디가 틀렸는지 보인다.
  const phoneRaw = String(formData.get("recipientPhone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const values = { recipientName, recipientPhone: phoneRaw, address };

  if (year === null) return { error: "어느 해의 책인지 알 수 없습니다.", values };

  if (recipientName === "") {
    return { error: "받는 분 이름을 적어주세요.", field: "recipientName", values };
  }
  if (recipientName.length > NAME_MAX) {
    return { error: `이름이 너무 깁니다. ${NAME_MAX}자까지 들어갑니다.`, field: "recipientName", values };
  }

  if (!isValidPhone(phoneRaw)) {
    return {
      error: "연락처를 다시 확인해주세요. 숫자만 9~11자리면 됩니다.",
      field: "recipientPhone",
      values,
    };
  }

  if (address.length < ADDRESS_MIN) {
    return { error: "받으실 주소를 적어주세요.", field: "address", values };
  }
  if (address.length > ADDRESS_MAX) {
    return { error: `주소가 너무 깁니다. ${ADDRESS_MAX}자까지 들어갑니다.`, field: "address", values };
  }

  const recipientPhone = normalizePhone(phoneRaw);

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!profile) return { error: "아이 정보를 찾지 못했습니다.", values };

  const collection = await prisma.collection.findUnique({
    where: { profileId_year: { profileId: profile.id, year } },
    select: { id: true },
  });
  if (!collection) return { error: "그 해의 책을 아직 만들지 않았습니다.", values };

  /**
   * 🔑 중복 차단은 여기서 한다. 버튼 잠금은 화면의 일이다.
   *   둘은 목적이 다르다 —
   *     버튼 잠금(form.tsx)은 **두 번 누르는 일 자체를 줄인다.** 눈에 보이는 응답이고,
   *       느린 회선에서 "안 눌렸나?" 하고 다시 누르는 것을 막는다.
   *     이 검사는 **두 번 눌렸을 때 두 건이 생기는 것을 막는다.** 새로고침 후 재전송,
   *       뒤로가기 후 재전송처럼 버튼이 관여할 수 없는 경로까지 덮는다.
   *   화면에서 막은 것은 방어가 아니다. 서버 액션은 폼을 거치지 않고도 호출된다.
   */
  const since = new Date(getNow().getTime() - DEDUP_WINDOW_MS);
  const duplicate = await prisma.order.findFirst({
    where: {
      collectionId: collection.id,
      recipientName,
      recipientPhone,
      address,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: { orderNo: true },
  });

  if (duplicate) {
    // 사용자가 원한 결과는 "주문이 들어갔다"이고, 이미 들어가 있다. 그 주문으로 보낸다.
    redirect(`/book/${year}?ordered=${duplicate.orderNo}`);
  }

  let orderNo = "";
  for (let attempt = 0; attempt < ORDERNO_RETRIES; attempt += 1) {
    const candidate = makeOrderNo();
    try {
      /**
       * 🔑 주문과 첫 이력을 한 번의 create로 만든다.
       *   따로 쓰면 "접수됐는데 언제 접수됐는지는 모르는 주문"이 생길 수 있다.
       *   상세 화면은 이력을 시간순으로 보여주는데, 첫 줄이 비면 그 화면이 성립하지 않는다.
       */
      await prisma.order.create({
        data: {
          orderNo: candidate,
          collectionId: collection.id,
          recipientName,
          recipientPhone,
          address,
          origin: "USER",
          events: { create: { status: "RECEIVED" } },
        },
        select: { id: true },
      });
      orderNo = candidate;
      break;
    } catch {
      /**
       * orderNo가 겹쳤다(@unique). 뽑기를 다시 한다.
       * 미리 조회해서 피하지 않는 이유: 조회와 생성 사이에 다른 요청이 같은 값을 쓸 수 있다.
       * **DB의 제약이 최종 방어선이고**, 여기서는 그 결과를 받아 다시 시도할 뿐이다.
       */
    }
  }

  if (orderNo === "") {
    return { error: "주문번호를 만들지 못했습니다. 잠시 뒤 다시 시도해주세요.", values };
  }

  redirect(`/book/${year}?ordered=${orderNo}`);
}
