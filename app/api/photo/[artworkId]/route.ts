import { getPrisma } from "@/lib/prisma";

/**
 * 작품 사진을 내려준다.  GET /api/photo/[작품id]
 *
 * 🔑 왜 작품 id로 찾나 (사진 id가 아니라)
 *   작품 하나에 사진 하나다. 사진 id로 받으면 목록을 그릴 때마다 사진 테이블을
 *   조인해서 id를 꺼내와야 한다. 작품 id로 받으면 목록은 사진 테이블을 아예 안 건드린다.
 *
 * 🔑 왜 파일이 아니라 DB에서 읽나
 *   next start는 public/을 부팅 시점에 스캔한다. 실행 중에 쓴 파일은 재시작 전까지 404다.
 *   볼륨을 붙여도 안 고쳐진다. (docs/03-feasibility.md §2)
 */
export async function GET(
  _request: Request,
  // Next 15부터 동적 세그먼트는 Promise로 온다. await 없이 쓰면 조용히 undefined가 된다.
  { params }: { params: Promise<{ artworkId: string }> },
) {
  const { artworkId } = await params;
  const prisma = getPrisma();

  const photo = await prisma.photo.findUnique({
    where: { artworkId },
    select: { bytes: true, mimeType: true },
  });

  if (!photo) {
    // 여기는 사람이 읽는 화면이 아니라 <img>의 src다. 예쁜 메시지를 줄 자리가 아니다.
    return new Response("찾을 수 없는 사진입니다.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mimeType,
      /**
       * 사진은 한 번 올리면 바뀌지 않는다. 그래서 오래 캐시해도 안전하고,
       * 목록을 스크롤할 때 같은 사진을 다시 받지 않는다.
       * private인 이유: 아이 사진이다. 중간 캐시 서버에 남기지 않는다.
       *
       * 🔑 편집 화면도 사진 교체를 제공하지 않는다 — 이 헤더는 그 전제 위에 있다.
       *   immutable은 "이 주소의 바이트는 영원히 안 바뀐다"는 약속이라
       *   ETag·Last-Modified 없이도 성립한다. 사진 교체를 열면 그 약속이 거짓이 되고,
       *   브라우저는 1년 동안 옛 사진을 보여주면서 재확인할 방법조차 없다.
       *   교체를 넣으려면 이 헤더를 먼저 바꿔야 한다. (app/artwork/[id]/edit/actions.ts)
       */
      "Cache-Control": "private, max-age=31536000, immutable",
      // 사용자가 올린 바이트를 그대로 돌려준다. 브라우저가 타입을 자기 마음대로
      // 추측하지 못하게 막는다(예: HTML로 해석해서 실행하는 것).
      "X-Content-Type-Options": "nosniff",
    },
  });
}
