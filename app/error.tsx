"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * 실패 화면.
 *
 * 🔑 이 화면이 없으면 실패가 "빈 화면"으로 보인다.
 *   DB를 끄고 홈을 열어봤다. 응답 5,334바이트가 전부 script·link 태그였고
 *   사용자 눈에 남는 글자는 <title> 하나였다. **아무 말도 하지 않는 화면**이다.
 *
 * 🔑 세 갈래가 전부 여기로 모인다
 *   ① DB가 끊겼을 때(목록·상세 쿼리 실패)
 *   ② 서버 액션이 던진 예외
 *   ③ 업로드 본문이 서버 한도를 넘겨 액션 실행 전에 잘렸을 때
 *   ③은 폼이 잡을 수 없다. 액션이 시작되지도 못하므로 useActionState에 오류가 안 온다.
 *   그래서 크기 검사를 고치는 것과 이 화면을 만드는 것이 한 쌍이다.
 *
 * 🔑 문구가 사과가 아니라 범위 축소다
 *   404와 같은 판단이다. 부모가 이 서비스에 맡긴 것은 "버려도 된다"는 허락이라,
 *   화면이 비면 첫 생각이 "내 기록이 날아갔나"다.
 *   그래서 먼저 하는 말이 "미안합니다"가 아니라 **"남기신 것은 그대로 있습니다"**다.
 *
 * 🔑 새 CSS를 쓰지 않았다.
 *   빈 목록·404와 같은 .blank를 쓴다. 셋 다 "볼 것이 없으니 다음 동작 하나만 남기는 화면"이다.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /**
   * 🔑 reset()만으로는 안 돌아온다. 실제로 눌러보고 알았다.
   *   DB를 껐다 켠 뒤 [다시 시도]를 눌렀는데 오류 화면이 그대로 남고 카드가 0개였다.
   *
   *   reset()은 **이미 받아둔 데이터로 경계 안쪽을 다시 그릴 뿐**이다.
   *   여기서 실패한 건 서버 컴포넌트의 쿼리라, 서버에서 화면을 다시 받아오지 않으면
   *   다시 그려봐야 같은 실패가 나온다. router.refresh()가 그 요청을 보낸다.
   *
   *   동작하지 않는 [다시 시도]는 없는 것보다 나쁘다 — 눌러본 사용자가
   *   "복구가 안 되는 상황"이라고 잘못 배우게 된다.
   */
  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="page">
      <div className="blank">
        <h1 className="blank__title">지금은 기록을 불러오지 못했어요.</h1>
        <p className="blank__body">
          <strong>남기신 것은 그대로 있습니다.</strong> 잠시 뒤 다시 시도해 주세요.
        </p>

        <div className="form__actions form__actions--center">
          <button type="button" className="btn" onClick={retry} disabled={pending}>
            {pending ? "다시 불러오는 중…" : "다시 시도"}
          </button>
          <Link href="/" className="btn btn--ghost">
            모아보기
          </Link>
        </div>
      </div>
    </div>
  );
}
