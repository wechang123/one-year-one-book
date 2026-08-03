import { randomInt } from "node:crypto";
import { todayInputValue } from "./date";
import { getNow } from "./now";

/**
 * 주문번호.
 *
 * 🔑 왜 cuid를 그대로 안 쓰나
 *   Order.id는 cuid다(schema.prisma). 그건 기계가 쓰는 값이고,
 *   **"주문번호가 어떻게 되세요"에 답할 수 있는 값이 아니다.**
 *   그래서 orderNo를 따로 두고 @unique를 걸어놨다. 이 함수가 그 값을 만든다.
 *
 * 🔑 사람이 전화로 부를 수 있어야 한다는 것이 형태를 정한다
 *   ① 날짜가 앞에 온다 — 언제 넣은 주문인지 번호만 보고 안다.
 *     문의가 오면 "며칠에 넣으셨죠"를 묻지 않아도 된다.
 *   ② 뒤는 네 글자만. 더 길면 불러주다 틀린다.
 *   ③ 헷갈리는 글자를 뺐다 — 0/O, 1/I/L. 전화로 부를 때 되묻게 되는 것들이다.
 *     소문자도 뺐다. "대문자예요 소문자예요"를 묻게 된다.
 */

/** 0·O·1·I·L을 뺀 31글자. 전화로 불러도 되묻지 않는 글자만 남겼다. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** 뒤에 붙는 무작위 부분의 길이. 31^4 ≈ 92만 가지. */
const SUFFIX_LEN = 4;

/**
 * "20260803-7K2M"
 *
 * 🔑 날짜는 반드시 lib/now.ts를 거친다.
 *   앱의 "지금"은 한 군데서만 만든다(eslint가 new Date()를 막는다).
 *   여기서 직접 만들면 자정을 걸칠 때 주문 레코드의 createdAt과 번호의 날짜가 하루 어긋난다.
 */
export function makeOrderNo(now: Date = getNow()): string {
  const date = todayInputValue(now).replaceAll("-", "");

  let suffix = "";
  for (let i = 0; i < SUFFIX_LEN; i += 1) {
    // Math.random이 아니라 crypto다. 주문번호는 남의 주문을 넘겨다볼 수 있는 값이면 안 된다.
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }

  return `${date}-${suffix}`;
}

/**
 * 주소창에서 받은 주문번호가 형식에 맞나.
 * 안 맞으면 DB까지 가지 않는다.
 */
export function isOrderNo(value: string): boolean {
  return new RegExp(`^\\d{8}-[${ALPHABET}]{${SUFFIX_LEN}}$`).test(value);
}
