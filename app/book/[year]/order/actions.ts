"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseYear, yearRange } from "@/lib/book";
import { makeOrderNo } from "@/lib/order-no";
import { isValidPhone, normalizePhone, phoneDigits } from "@/lib/phone";
import { getNow } from "@/lib/now";
import { isUniqueViolation, logError } from "@/lib/prisma-error";

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
 *   책 한 권에 주문 여러 건은 스키마가 허용한다 — 그걸 지키면서 실수만 걸러내는 방법이다.
 */
const DEDUP_WINDOW_MS = 60_000;

/**
 * DB가 막을 열쇠. **아래 findFirst가 같다고 보는 것과 정확히 같은 것**으로 만든다.
 *
 * 🔑 조회로는 못 막는 것이 있다.
 *   아래 findFirst는 **순차 재제출**(새로고침·뒤로가기)을 정확히 막는다.
 *   그런데 **동시 제출**은 못 막는다 — 두 요청이 조회와 생성 사이의 틈에 같이 들어오면
 *   둘 다 "없다"를 보고 둘 다 만든다. **실제로 두 건이 생겼다.**
 *   그래서 같은 열쇠를 DB의 유니크 제약에 걸고, 충돌을 오류가 아니라 정상 흐름으로 받는다.
 *
 *   상용 결제 API가 `POST /orders`에 `Idempotency-Key`를 **필수**로 두는 이유가 정확히 이것이다.
 *   클라이언트가 키를 만들어 보내면 재시도가 몇 번이든 결과가 하나다.
 *   여기서는 클라이언트가 키를 안 보내므로 **서버가 요청 내용으로 키를 조립한다.**
 *
 * 🔴 이 열쇠가 **연락처만 보던 시절이 있었다. 그게 버그였다.**
 *   아래 findFirst는 이름·연락처·주소 셋이 다 같아야 중복으로 봤는데,
 *   열쇠는 연락처만 봤다. 그래서 **받는 사람과 주소가 달라도 연락처가 같으면**
 *   둘째 주문이 유니크 제약에 걸렸고, 코드는 그걸 "동시 제출"로 해석해
 *   **첫 주문의 번호로 보내버렸다.** 화면은 "접수됐습니다"라고 말하고 DB에는 한 건뿐이다.
 *   한 연락처로 여러 곳에 보내는 것(집·처가·할머니 댁)은 이 서비스에서 정상적인 일이다.
 *
 *   교훈은 "필드를 빠뜨렸다"가 아니다 — **같은 판정을 두 곳에서 따로 정의했다**는 것이다.
 *   그래서 지금은 아래 findFirst의 where와 이 함수의 인자가 **같은 값 묶음**을 받는다.
 *
 * 🔴 버킷 경계는 완전하지 않다. 59.9초와 60.1초에 도착한 **동시** 요청은 다른 버킷이 된다.
 *   그 경우는 아래 findFirst가 60초를 되돌아보며 잡는다. 둘을 같이 써야 덮인다.
 */
function makeDedupKey(
  collectionId: string,
  who: { recipientName: string; phoneRaw: string; address: string },
  now: Date,
): string {
  const bucket = Math.floor(now.getTime() / DEDUP_WINDOW_MS);
  /**
   * 🔑 숫자만 남겨서 키를 만든다.
   *   저장은 사용자가 친 그대로 하지만(lib/phone.ts), 키까지 그대로 쓰면
   *   `010-1234-5678`과 `01012345678`이 **다른 키가 되어 중복이 안 걸린다.**
   *   비교하는 값과 보여주는 값은 다를 수 있다.
   */
  const material = [
    collectionId,
    who.recipientName,
    phoneDigits(who.phoneRaw),
    who.address,
    bucket,
  ].join("\u0000");

  /**
   * 🔑 갈림길: 값을 그대로 이어붙일까 vs 해시할까 → **해시.**
   *   그대로 이어붙이면 키를 눈으로 읽을 수 있어 디버깅이 쉽다. 대신 두 가지가 걸린다.
   *     ① 이름과 주소가 **자기 열에 이미 평문으로 있는데 키에 또 들어간다.**
   *        같은 개인정보가 두 벌이 되고, 지울 때 한 곳을 잊으면 남는다.
   *     ② 키 길이가 주소 길이를 따라 늘어난다. btree 유니크 인덱스에는 길이 상한이 있다.
   *   해시는 둘 다 없앤다. 잃는 것은 "키만 보고 어떤 주문인지 아는 것"인데,
   *   그건 이 열의 일이 아니다 — 이 열은 **같은지 다른지**만 판정한다. 사람이 찾을 때는 orderNo로 찾는다.
   *
   *   구분자로 `\0`을 쓴 이유: 이름·주소에 절대 들어갈 수 없는 문자여야
   *   `"김하늘|서울"`과 `"김하|늘서울"`이 같은 키가 되는 일이 없다.
   */
  return createHash("sha256").update(material).digest("base64url");
}

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
      error: "연락처를 다시 확인해주세요. 숫자가 8~15자리여야 합니다.",
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
   * 🔑 수록작이 0점이면 주문을 받지 않는다.
   *   책은 있는데 그 해 작품이 전부 지워진 경우가 있을 수 있다(데모 초기화 직후 등).
   *   **0쪽짜리 책을 인쇄할 수는 없다.** 책 만들기 쪽에도 같은 가드가 있지만,
   *   두 시점 사이에 작품이 사라질 수 있으므로 주문 시점에 다시 본다.
   */
  const artworks = await prisma.artwork.count({
    where: { profileId: profile.id, madeOn: yearRange(year) },
  });
  if (artworks === 0) {
    return { error: `${year}년에 담긴 것이 없어 주문할 수 없습니다.`, values };
  }

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

  // 위 where와 같은 값 묶음을 넘긴다. 둘이 갈라지면 그게 그대로 버그가 된다.
  const dedupKey = makeDedupKey(collection.id, { recipientName, phoneRaw, address }, getNow());

  let orderNo = "";
  let lastError: unknown = null;

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
          dedupKey,
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
    } catch (e) {
      lastError = e;

      /**
       * 🔑 유니크 충돌이라도 **어느 열이 걸렸는지에 따라 할 일이 정반대다.**
       *   전에는 이 catch가 비어 있어서 둘을 구분하지 못했고, 그래서 어떤 실패든
       *   화면은 "주문번호를 만들지 못했습니다"라고 말했다. 틀린 범인을 지목한 것이다.
       */
      if (isUniqueViolation(e)) {
        // dedupKey가 걸렸다 = 같은 요청이 이미 들어와 있다. 다시 뽑아도 또 걸린다.
        const existing = await prisma.order.findUnique({
          where: { dedupKey },
          select: { orderNo: true },
        });
        if (existing) {
          // 동시 제출이었다. 사용자가 원한 결과는 이미 이뤄져 있으므로 그 주문으로 보낸다.
          redirect(`/book/${year}?ordered=${existing.orderNo}`);
        }
        // dedupKey가 아니라 orderNo가 겹쳤다. 뽑기를 다시 한다.
        continue;
      }

      // 유니크 위반이 아니면 다시 뽑아도 소용없다. 로그에 남기고 나간다.
      logError("createOrder", e);
      return { error: "주문을 넣지 못했습니다. 잠시 뒤 다시 시도해주세요.", values };
    }
  }

  if (orderNo === "") {
    /**
     * 여기까지 왔다는 건 유니크 충돌이 계속됐다는 뜻이다. 두 가지가 섞여 있다.
     *   ① dedupKey 충돌인데 상대 트랜잭션이 아직 커밋 전이라 조회가 비었다 → 지금은 보일 수 있다
     *   ② orderNo가 연속으로 겹쳤다 → 확률이 지극히 낮고, 다시 시도하면 된다
     * ①을 먼저 확인하고, 아니면 ②로 안내한다. **원인이 다르면 문구도 달라야 한다.**
     */
    const settled = await prisma.order.findUnique({
      where: { dedupKey },
      select: { orderNo: true },
    });
    if (settled) redirect(`/book/${year}?ordered=${settled.orderNo}`);

    logError("createOrder:orderNo", lastError);
    return { error: "주문번호를 만들지 못했습니다. 잠시 뒤 다시 시도해주세요.", values };
  }

  redirect(`/book/${year}?ordered=${orderNo}`);
}
