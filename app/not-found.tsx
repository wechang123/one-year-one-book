import Link from "next/link";

/**
 * 404.
 *
 * 🔑 이 서비스에서 404가 무서운 이유는 따로 있다.
 *   부모가 작품 주소를 열었는데 화면이 비면, 먼저 드는 생각은
 *   "주소가 틀렸나"가 아니라 **"내 기록이 날아갔나"**다.
 *   이 서비스는 "실물을 버려도 된다"고 말해놓고 받은 기록이라,
 *   그 불안이 서비스의 약속 자체를 흔든다.
 *   그래서 문구가 가장 먼저 하는 일은 사과가 아니라 **범위를 좁혀주는 것**이다.
 *   — 없어진 건 이 주소 하나고, 남긴 것은 목록에 그대로 있다.
 *
 * 🔑 새 CSS를 쓰지 않았다.
 *   빈 목록(app/page.tsx의 EmptyList)이 이미 `.blank`로 같은 일을 한다 —
 *   "볼 것이 없는 화면에서 다음 동작 하나만 남긴다".
 *   404도 같은 종류의 화면이라 같은 옷을 입는 게 맞다.
 *   여기서 전용 스타일을 새로 만들면 **같은 상황이 두 얼굴로 보인다.**
 */
export default function NotFound() {
  return (
    <div className="page">
      <div className="blank">
        <h1 className="blank__title">이 주소에는 아무것도 없어요.</h1>
        <p className="blank__body">
          주소가 잘못되었거나 지워진 작품입니다.{" "}
          <strong>남기신 기록은 목록에 그대로 있습니다.</strong>
        </p>
        <Link href="/" className="btn">
          작품 목록으로
        </Link>
      </div>
    </div>
  );
}
