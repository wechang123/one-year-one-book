"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { applySeed } from "@/lib/seed-data";
import { logError } from "@/lib/prisma-error";

/**
 * 데모 초기화.
 *
 * 🔑 이 기능이 없으면 나머지 기능이 안 눌린다.
 *   처음 여는 사람은 남의 데이터를 망가뜨릴까 봐 버튼을 안 누른다.
 *   등록·편집·주문·상태 변경을 다 만들어놔도 **되돌릴 수 없으면 구경만 하고 나간다.**
 *   그래서 이건 부가 기능이 아니라 **나머지 기능을 쓰이게 만드는 장치**다.
 *
 * 🔑 "USER 삭제"만으로는 부족하다.
 *   시드 작품의 설명을 고치면 그 행의 origin은 SEED 그대로다 — 삭제 대상이 아니다.
 *   그러면 고쳐진 문장이 영구히 남고, 다음 사람은 원래 문장을 볼 수 없다.
 *   초기화는 **① 직접 만든 것 삭제 + ② 시드 재적용** 둘 다여야 한다.
 *   ②가 고쳐진 시드 작품의 말과 날짜를 원래대로 되돌린다(lib/seed-data.ts의 upsert.update).
 *
 * 🔑 시드가 만든 것은 지우지 않는다.
 *   전부 지우고 다시 넣는 편이 코드는 짧지만, 사진 바이트 1.7MB를 매번 다시 쓰게 된다.
 *   그리고 "초기화하면 사진이 사라졌다가 돌아온다"는 상태를 만들 이유가 없다.
 */

/**
 * 🔑 지운 건수를 돌려주지 않는다.
 *   전에는 작품 + 책의 count만 더해 "6건을 지웠습니다"라고 말했다.
 *   그런데 같은 순간 그 책에 딸린 **주문과 이력이 cascade로 같이 사라진다.**
 *   사용자가 "6건"을 읽고 /orders에 가면 주문이 없다 — 숫자가 화면과 어긋난다.
 *   정확히 세려면 지우기 전에 네 테이블을 다 세야 하는데,
 *   그 숫자가 사용자에게 해주는 일이 없다. **틀린 숫자보다 없는 숫자가 낫다.**
 */
export type ResetState = { done?: boolean; error?: string };

export async function resetDemo(): Promise<ResetState> {
  const prisma = getPrisma();

  try {
    await prisma.$transaction(
      async (tx) => {
        /**
         * 🔑 지우는 순서를 신경 쓰지 않아도 되는 이유
         *   Photo·Order·OrderEvent는 전부 onDelete: Cascade로 매달려 있다(schema.prisma).
         *   작품을 지우면 사진이, 책을 지우면 주문과 그 이력이 같이 사라진다.
         *   고아 데이터를 손으로 지우는 코드를 두면 스키마가 이미 보장하는 것을 두 번 적는 셈이고,
         *   한쪽만 고쳤을 때 갈라진다.
         */
        await tx.artwork.deleteMany({ where: { origin: "USER" } });
        await tx.collection.deleteMany({ where: { origin: "USER" } });

        /**
         * 🔑 시드 재적용을 같은 트랜잭션 안에 둔다.
         *   전에는 밖에 있었고, 주석은 "앞의 삭제와 성패를 묶을 이유도 없다"고 정당화했다.
         *   묶을 이유가 있었다 — **화면에 띄우는 문장이 사실이어야 하기 때문이다.**
         *
         *   밖에 두면 재적용이 실패했을 때 화면은 "되돌리지 못했습니다"라고 말하는데,
         *   그 시점에 작품·책·주문은 **이미 전부 지워진 상태**다.
         *   되돌리지 못한 게 아니라 지우기만 한 것이고, 사용자는 그걸 모른 채
         *   "아무 일도 없었구나" 하고 다시 누른다.
         *
         *   잠금을 오래 잡는 건 맞다(이미지 10개를 읽어 upsert를 돈다). 그래서 타임아웃을 늘렸다.
         *   혼자 쓰는 데모 초기화라 그 대가가 "문구가 거짓이 되는 것"보다 싸다.
         */
        await applySeed(tx);
      },
      {
        // 기본 5초로는 이미지 10장을 읽는 동안 끊긴다.
        timeout: 30_000,
        maxWait: 10_000,
      },
    );

    /**
     * 모든 화면이 바뀐다 — 목록·책·주문이 전부. "layout"으로 걸어 통째로 다시 그린다.
     * 화면마다 revalidatePath를 적으면 화면을 하나 더 만들 때 여기를 고치는 걸 잊는다.
     */
    revalidatePath("/", "layout");

    return { done: true };
  } catch (e) {
    logError("resetDemo", e);
    return { error: "되돌리지 못했습니다. 잠시 뒤 다시 시도해주세요." };
  }
}
