import Link from "next/link";
import { todayInputValue } from "@/lib/date";
import { getNow } from "@/lib/now";
import { NewArtworkForm } from "./form";

/**
 * 작품 등록.
 *
 * 🔑 등록에 창(window)·주기 규칙이 없다.
 *   이 서비스의 트리거는 앱 밖에 있다 — 아이가 그림을 들고 오는 것이다.
 *   그건 앱이 만들지 않아도 반드시 일어나므로, 앱이 할 일은 그때 열려 있는 것뿐이다.
 *
 * 🔑 "오늘"을 서버에서 계산해 내려보낸다.
 *   폼에서 만들면 사용자 기기의 시간대를 따라가 컨테이너와 다른 날짜가 나올 수 있다.
 *   만든 날은 어느 해 책에 들어갈지를 정하는 값이라 하루가 밀리면 책이 바뀐다.
 */
export default function NewArtworkPage() {
  const today = todayInputValue(getNow());

  return (
    <div className="page page--narrow">
      <nav className="detail__nav">
        <Link href="/" className="btn btn--ghost">
          ← 작품 목록
        </Link>
      </nav>

      <header className="form__head">
        <h1 className="form__title">한 점 남기기</h1>
        <p className="form__lede">
          {/*
            여기서 이미 목적을 말해둔다. 저장 후에 처음 듣는 것보다,
            무엇을 위해 적는지 알고 적는 편이 아이 말을 더 정확히 받아적게 만든다.
          */}
          사진과 그때 한 말을 남겨두면, 한 해가 지나 한 권으로 묶입니다.
        </p>
      </header>

      <NewArtworkForm today={today} />
    </div>
  );
}
