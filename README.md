# 한 해, 한 권

> **아이가 만든 것을 아이의 말과 함께 남기고, 한 해가 지나면 한 권으로 묶는다.
> 그래서 실물을 마음 편히 정리할 수 있게 한다.**

보통의 기록 서비스는 **남기려고** 기록한다. 이건 **버리려고** 기록한다.
그래서 책이 부가 기능이 아니라 목적이다 — 화면 속 데이터만으로는 실물을 버릴 결심이 서지 않는다.

---

## 실행

**필요한 것은 Docker 하나. `.env`도, 로그인도, 외부 API 키도 필요 없다.**

```bash
git clone https://github.com/wechang123/one-year-one-book.git
cd one-year-one-book
docker compose up --build
```

→ <http://localhost:3000> 을 열면 **작품 10점이 이미 들어 있다.**

기동할 때 마이그레이션 3개가 적용되고 시드가 실행된다. 시드는 멱등이라 다시 켜도 늘지 않는다.

### 포트가 이미 쓰이고 있다면

호스트 포트는 환경변수로 바꾼다. 컨테이너 안은 항상 3000이다.

```bash
PORT=8080 DB_PORT=5555 docker compose up --build
```

| 변수 | 기본값 | 하는 일 |
|---|---|---|
| `PORT` | `3000` | 앱을 띄울 호스트 포트 |
| `DB_PORT` | `5433` | Postgres 호스트 포트 (5432 대신 5433인 이유는 아래) |

> 🔑 **이 변수는 장식이 아니라 실제로 필요해서 생겼다.**
> 개발 중 `docker compose up`이 *"Bind for 0.0.0.0:5433 failed"*로 죽었다.
> 같은 머신에서 돌던 다른 프로젝트의 DB가 그 포트를 잡고 있었다.
> **남이 쓰는 포트를 뺏는 대신 이쪽이 비켜갈 수 있어야 한다**고 보고 포트를 환경변수로 뺐다.
> 그 이후로도 5433은 계속 막혀 있었고, 그래서 이 값은 문서가 아니라 사고로 검증됐다.

---

## 켜면 무엇이 있나

| | 상태 | 왜 |
|---|---|---|
| **작품 10점** | 등록되어 있음 | 켜자마자 이게 무슨 서비스인지 보인다 |
| **책** | **0권** | 직접 만들어보시라고 비워뒀다 |
| **주문** | **0건** | 아래 |

**주문을 1건도 넣지 않았다.** `Order`는 `Collection`에 딸려 있고 책은 `@@unique([profileId, year])`다.
주문 하나를 넣으려면 2026년 책을 먼저 만들어야 하는데, 그러면 **만들어볼 책이 사라진다.**
남이 만든 주문을 구경하는 것보다 **직접 만든** 주문의 상태가 바뀌는 걸 보는 편이 강하다고 봤다.

---

## 화면

| 화면 | 경로 | 이 화면이 없으면 못 하는 것 |
|---|---|---|
| 작품 목록 | `/` | 무슨 서비스인지, 다음에 뭘 눌러야 하는지 알기 |
| 작품 상세 | `/artwork/[id]` | 사진을 원본 대신 삼을 만큼 크게 보기 |
| 작품 등록 | `/artwork/new` | 아이가 그림을 내민 30초 안에 남기기 |
| 설명 편집 | `/artwork/[id]/edit` | 나중에 물어본 말 채워 넣기, 날짜 오타 고치기 |
| 404 | 그 외 전부 | 막다른 길에서 목록으로 돌아오기 |

*(주문·책 화면은 아직 없다. 스키마와 마이그레이션은 들어가 있다.)*

### 설계에서 설명할 수 있어야 한다고 본 것 몇 가지

- **등록에 주기·마감·창(window) 규칙이 없다.** 이 서비스의 트리거는 앱 밖에 있다 —
  *아이가 그림을 들고 오는 것*이고, 그건 앱이 만들지 않아도 반드시 일어난다.
  앱이 할 일은 그때 열려 있는 것뿐이다.

- **아이 말이 필수가 아니다.** 필수로 막으면 말을 못 받은 날엔 사진도 못 남긴다.
  사진 없는 말은 쓸모없지만, 말 없는 사진은 나중에 채울 수 있다.
  대신 비어 있다는 사실을 숨기지 않는다 — 목록에 *"아직 안 물어봤어요"*로 나온다.

- **저장 후 문구가 "저장되었습니다"가 아니다.** *"이제 원본은 정리하셔도 됩니다."*
  부모는 보관하려고가 아니라 **버려도 된다는 허락**을 받으려고 이 서비스를 연다.

- **편집에서 사진을 바꿀 수 없다.** 기능을 뺀 게 아니라 다른 두 곳을 성립시키는 전제다 —
  사진 응답의 `Cache-Control: immutable`은 *"이 주소의 바이트는 안 바뀐다"*는 약속이라
  ETag 없이도 성립하고, 시드의 `photo.upsert`가 바이트를 덮어쓰지 않아도 안전하다.
  잘못 고른 사진은 **등록 화면의 미리보기**에서 잡는다.

- **만든 날은 부모가 입력한다.** EXIF에서 뽑지 않는다.
  *사진 찍은 날 ≠ 아이가 만든 날*이다. 벽에 붙어 있던 그림을 오늘 찍는 일이 흔하다.

---

## 반응형 — 실측값

원칙: **"화면이 넓어지면 칸이 커지는 게 아니라 더 많이 보인다."**
브레이크포인트로 열 수를 적는 대신 `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))` 한 줄로 처리했다.

| 화면 폭 | 목록 | 상세 |
|---|---|---|
| **1440px** | 4열 · 카드 322px | 사진 옆에 아이 말 (2단) |
| **375px** | 1열 · 카드 343px | 사진 아래 아이 말 (1단) |

`.page`의 `max-width`가 1400px이라 **1440px 이상에서는 배치가 같다** (1512px에서도 4열·322px).
상세의 사진은 비율을 고정하지 않고 `max-height: 72vh`만 건다 —
시드 10장의 비율이 1280×905(가로)부터 1194×1843(세로)까지 제각각이고, 실제 아이 그림이 원래 그렇다.

---

## 시드 이미지 출처

`public/seed/01~10.jpg` · **전부 CC0 / Public Domain** · 출처는 전부 Wikimedia Commons · 합계 1.7MB

**CC0/PD는 표기 의무가 없다. 의무가 없어도 밝히는 것이 맞다고 봤다.**

| 파일 | 원본 | 라이선스 |
|---|---|---|
| `01-girl.jpg` | [Dessin efant.jpg](https://commons.wikimedia.org/wiki/File:Dessin_efant.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `02-family.jpg` | [Family1.20110425.jpg](https://commons.wikimedia.org/wiki/File:Family1.20110425.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `03-rooster.jpg` | [IMG Kinderbild Hahn.jpg](https://commons.wikimedia.org/wiki/File:IMG_Kinderbild_Hahn.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `04-mom-and-me.jpg` | [27 de mayo 2026 - dia de la madre.jpg](https://commons.wikimedia.org/wiki/File:27_de_mayo_2026_-_dia_de_la_madre.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `05-car.jpg` | [Barnteckning.jpg](https://commons.wikimedia.org/wiki/File:Barnteckning.jpg) | Public domain (PD-self) |
| `06-house.jpg` | [2009.04.01 - Fachada - 7 anos.jpg](https://commons.wikimedia.org/wiki/File:2009.04.01_-_Fachada_-_7_anos.jpg) | Public domain · 저작자 Alessandro Gomes |
| `07-people.jpg` | [Monigotes con amor.jpg](https://commons.wikimedia.org/wiki/File:Monigotes_con_amor.jpg) | Public domain (PD-self) |
| `08-comic.jpg` | [Más monigotes con amor.jpg](https://commons.wikimedia.org/wiki/File:M%C3%A1s_monigotes_con_amor.jpg) | Public domain (PD-self) |
| `09-tadpole.jpg` | [Huvudfoting 070226 JonathanHermin3yo.jpg](https://commons.wikimedia.org/wiki/File:Huvudfoting_070226_JonathanHermin3yo.jpg) | Public domain (PD-self) |
| `10-self-portrait.jpg` | [Ephraim33 Self Portrait.jpg](https://commons.wikimedia.org/wiki/File:Ephraim33_Self_Portrait.jpg) | Public domain (PD-self) |

전부 리사이즈만 했고 그림 자체는 손대지 않았다(07·08의 스페인어 낙서도 그대로 두고, 아이 말이 그걸 받아 옮기게 썼다).

**라이선스 위에 두 가지를 더 걸었다.**

1. **아이 얼굴이 프레임에 없을 것** — 초상권은 라이선스와 무관하게 걸린다. 10장 중 얼굴이 나온 것은 없다.
2. **업로더가 곧 권리자일 것** — 🔑 저작권이 두 겹이다. ① 그림을 그린 아이 ② 사진을 찍은 사람.
   남의 아이 그림을 찍어 올린 사람은 ②만 라이선스할 수 있고 ①에는 권한이 없다.
   실제로 `PD-USGov-EPA` 태그가 붙었지만 **그림을 그린 건 연방 직원이 아니라 5학년생**인 파일을 발견해 배제했다.

**디지털 그림판 작품은 전량 배제했다.** 전부 실물을 촬영·스캔한 것이다 —
이 서비스의 전제가 *"실물이 쌓여서 버려야 한다"*인데 **디지털은 버릴 실물이 없다.**

---

## 기술 선택에서 함정이었던 것 두 개

**① 업로드 파일을 `public/`에 쓰면 안 된다**
`next start`는 `public/`을 **부팅 시점에 스캔**한다. 실행 중에 쓴 파일은 **재시작 전까지 404**이고
볼륨을 붙여도 안 고쳐진다. 그래서 사진은 DB의 `Bytes` 컬럼에 넣고 route handler로 서빙한다
(`app/api/photo/[artworkId]/route.ts`). 커밋된 시드 이미지는 부팅 시점에 이미 있으므로 정상이다.

**② Server Action 본문 크기 기본값은 1MB다**
폰으로 찍은 사진은 2~5MB라 **오류 없이 조용히 실패한다.**
`next.config.ts`의 `serverActions.bodySizeLimit`을 `8mb`로 뒀다.

그리고 업로드 형식은 `File.type`이 아니라 **바이트 앞부분(매직 넘버)에서 읽는다**(`lib/image.ts`).
`type`은 브라우저가 확장자에서 추측해 붙인 문자열이고, 이 값이 그대로 사진을 내려줄 때의
`Content-Type`이 되기 때문에 들어오는 자리에서 확정하지 않으면 고칠 자리가 없다.

---

## 스택

Next 16.2.12 / React 19.2.8 / Prisma 7.9.1 + `@prisma/adapter-pg` / PostgreSQL 18 / TypeScript 6.0.3
· UI 라이브러리 없음 (CSS 직접 작성) · **외부 API·LLM 호출 없음**

> Prisma 7부터 `datasource` 블록에 `url`을 둘 수 없다. 연결 문자열은 `prisma.config.ts`가,
> 실제 연결은 드라이버 어댑터가 맡는다. (이걸 어겨서 8분을 썼다 — `docs/worklog.md` 10:14)

---

## 이 저장소를 읽는 법

**커밋이 논리 단위로 쪼개져 있는 것 자체가 산출물이다.** 결정 하나에 커밋 하나를 맞췄다.
기능은 이슈 → 브랜치 → PR → squash merge로 들어갔고, **판단과 거부한 선택지는 PR 본문에 남아 있다.**

| 문서 | 내용 |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | AI 에이전트에게 준 작업 규칙 — 이 저장소를 어떻게 만들었는지 |
| [`docs/01-problem.md`](./docs/01-problem.md) | 문제 정의 |
| [`docs/02-user.md`](./docs/02-user.md) | 사용자 정의 (주 사용자 / 이 저장소를 처음 여는 사람) |
| [`docs/03-feasibility.md`](./docs/03-feasibility.md) | 타당성 판정 — 경제·기술·법 3축 |
| [`docs/04-content.md`](./docs/04-content.md) | 시드 문장 10개와 그 근거 |
| [`docs/04b-…(채택안함).md`](./docs/04b-대안-생성이미지%28채택안함%29.md) | **검토했다가 접은 경로**와 왜 접었는지 |
| [`docs/worklog.md`](./docs/worklog.md) | 🔴 **무엇이 틀렸고 어떻게 발견했는지**, 시각과 함께 |
