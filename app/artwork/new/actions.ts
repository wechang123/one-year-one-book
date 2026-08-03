"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseDateInputValue, todayInputValue } from "@/lib/date";
import { formatBytes, sniffImage } from "@/lib/image";
import { getNow } from "@/lib/now";

/**
 * 작품 등록.
 *
 * 🔑 검사를 서버에서 다시 하는 이유
 *   폼에도 accept·required·max를 걸어두었다. 그건 **안내**이지 방어가 아니다.
 *   서버 액션은 그냥 POST 엔드포인트라 폼을 거치지 않고도 호출된다.
 *   화면에서 막은 것과 서버에서 막은 것은 목적이 다르다 —
 *   앞의 것은 실수를 줄이려고, 뒤의 것은 데이터가 깨지지 않게.
 */

/**
 * 사진 한 장의 상한.
 *
 * 🔑 next.config.ts의 bodySizeLimit보다 **작아야 한다 — 같으면 이 분기가 죽는다.**
 *   bodySizeLimit은 파일이 아니라 요청 본문 전체(multipart 경계·다른 필드 포함)에 걸린다.
 *   두 값이 같으면 상한을 넘는 파일은 본문 단계에서 먼저 잘려 이 함수가 실행되지 않고,
 *   아래 "사진이 너무 큽니다"는 절대 도달할 수 없는 코드가 된다.
 *   실제로 그 상태였다 — 화면은 8MB까지라고 안내하면서 8MB를 넘기면 빈 오류만 났다.
 */
const MAX_BYTES = 8 * 1024 * 1024;

export type NewArtworkState = {
  error?: string;
  /** 어느 칸이 문제인지. 폼이 그 칸으로 초점을 옮기는 데 쓴다. */
  field?: "photo" | "madeOn";
};

/** 브라우저가 보낸 원본 크기. 화면 표시용이라 못 믿을 값이면 그냥 버린다. */
function readDimension(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 100_000) return null;
  return n;
}

export async function createArtwork(
  _prev: NewArtworkState,
  formData: FormData,
): Promise<NewArtworkState> {
  const file = formData.get("photo");
  const quoteRaw = formData.get("childQuote");
  const madeOnRaw = formData.get("madeOn");

  // ── 사진 ─────────────────────────────────────────────
  if (!(file instanceof File) || file.size === 0) {
    return { error: "사진을 한 장 골라주세요. 이 서비스는 사진이 있어야 성립합니다.", field: "photo" };
  }

  if (file.size > MAX_BYTES) {
    return {
      error: `사진이 너무 큽니다 (${formatBytes(file.size)}). ${formatBytes(MAX_BYTES)}까지 올릴 수 있어요.`,
      field: "photo",
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  /**
   * 형식은 브라우저가 말한 것이 아니라 바이트에서 읽는다. (lib/image.ts)
   * 저장하는 mimeType이 곧 사진을 내려줄 때의 Content-Type이 되므로
   * 여기서 확정하지 않으면 나중에 고칠 자리가 없다.
   */
  const kind = sniffImage(bytes);
  if (!kind) {
    return {
      error: "JPG · PNG · WebP만 올릴 수 있어요. 아이폰의 HEIC는 브라우저가 못 그려서 받지 않습니다.",
      field: "photo",
    };
  }

  // ── 만든 날 ───────────────────────────────────────────
  const madeOn = typeof madeOnRaw === "string" ? parseDateInputValue(madeOnRaw) : null;
  if (!madeOn) {
    return { error: "만든 날을 확인해주세요. 없는 날짜입니다.", field: "madeOn" };
  }

  /**
   * 미래는 막는다. 연도 오타(2027)가 가장 흔한 실수인데, 이 값이 어느 해 책에
   * 들어갈지를 정하기 때문에(Collection은 madeOn의 연도로 수록작을 찾는다)
   * 한 글자 실수가 작품을 엉뚱한 책으로 보낸다.
   */
  const today = parseDateInputValue(todayInputValue(getNow()));
  if (today && madeOn > today) {
    return { error: "아직 오지 않은 날짜예요. 만든 날을 다시 확인해주세요.", field: "madeOn" };
  }

  // ── 아이 말 ───────────────────────────────────────────
  /**
   * 비워도 저장한다. 필수로 막으면 말을 못 받은 날엔 사진도 못 남긴다.
   * 사진 없는 말은 쓸모없지만, 말 없는 사진은 나중에 채울 수 있다. (schema.prisma)
   */
  const quote = typeof quoteRaw === "string" ? quoteRaw.trim() : "";

  const prisma = getPrisma();
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!profile) {
    return { error: "아이 정보를 찾지 못했습니다. 컨테이너를 다시 시작하면 초기 데이터가 만들어집니다." };
  }

  /**
   * 🔑 작품과 사진을 한 번의 create로 만든다.
   *   따로 만들면 사진 저장이 실패했을 때 사진 없는 작품이 남고,
   *   그건 목록에서 깨진 이미지로 렌더된다. 중첩 create는 한 트랜잭션이라
   *   둘 다 생기거나 둘 다 안 생긴다 — "사진 없는 작품"이 발생 자체를 못 한다.
   */
  const artwork = await prisma.artwork.create({
    data: {
      profileId: profile.id,
      childQuote: quote === "" ? null : quote,
      madeOn,
      // [데모 초기화]가 지울 대상. 시드는 남고 직접 만든 것만 사라진다.
      origin: "USER",
      photo: {
        create: {
          bytes,
          mimeType: kind.mimeType,
          width: readDimension(formData.get("width")),
          height: readDimension(formData.get("height")),
        },
      },
    },
    select: { id: true },
  });

  /**
   * 목록이 아니라 방금 만든 작품으로 보낸다.
   * 이 서비스가 부모에게 하려는 말은 "저장됐습니다"가 아니라 "이제 정리하셔도 됩니다"인데,
   * 그 말은 **사진이 크게 보이는 자리**에서 해야 믿긴다. 목록의 작은 카드로는 부족하다.
   *
   * redirect는 예외를 던져 흐름을 끊는다. 그래서 try/catch 안에 두지 않는다.
   */
  redirect(`/artwork/${artwork.id}?saved=1`);
}
