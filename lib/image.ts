/**
 * 업로드된 바이트가 정말 이미지인지 판별한다.
 *
 * 🔑 왜 file.type을 안 믿나
 *   FormData의 File.type은 **브라우저가 붙여 보낸 문자열**이다. 파일 확장자에서 추측한 값이고,
 *   요청을 직접 만들면 아무 값이나 넣을 수 있다. 그걸로 화이트리스트를 검사하면
 *   "화이트리스트를 통과한 값"이 아니라 "상대가 통과한다고 말한 값"을 저장하게 된다.
 *
 *   게다가 이 서비스는 그 값을 그대로 Content-Type으로 돌려준다
 *   (app/api/photo/[artworkId]/route.ts). 저장한 문자열이 곧 응답 헤더가 되는 구조라,
 *   들어오는 자리에서 확정해두지 않으면 나가는 자리에서 고칠 기회가 없다.
 *
 *   그래서 **바이트 앞부분(매직 넘버)을 직접 읽어** 형식을 정하고, 그 결과만 저장한다.
 *   확장자를 .jpg로 바꿔도, type을 위조해도 결과는 바뀌지 않는다.
 *
 * 🔑 왜 이 세 가지만인가
 *   폰 카메라와 스캔 앱이 내놓는 것이 사실상 JPEG·PNG·WebP다. HEIC는 뺐다 —
 *   아이폰 기본 포맷이지만 브라우저 <img>가 못 그린다. 저장은 되는데 화면에서 안 보이는
 *   상태가 가장 나쁘다. 받아놓고 못 보여주느니 받는 자리에서 거절하고 이유를 말한다.
 */

export type ImageKind = { mimeType: string; label: string };

/** 앞 12바이트면 세 형식 모두 판별된다. */
const HEADER_BYTES = 12;

export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < HEADER_BYTES) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", label: "JPG" };
  }

  // PNG: 89 "PNG" CR LF SUB LF — 파일이 전송 중 변조되면 깨지도록 설계된 8바이트다.
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (PNG.every((b, i) => bytes[i] === b)) {
    return { mimeType: "image/png", label: "PNG" };
  }

  // WebP: "RIFF" + 4바이트 길이 + "WEBP". 길이 4바이트는 건너뛴다.
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { mimeType: "image/webp", label: "WebP" };
  }

  return null;
}

/** 화면에 쓸 "3.2MB". 오류 문구에서 한도와 실제 크기를 같이 보여주려고 만들었다. */
export function formatBytes(n: number): string {
  const mb = n / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)}MB`;
  return `${Math.max(1, Math.round(n / 1024))}KB`;
}
