# 04-b. 시드 이미지 생성 프롬프트

> `04-content.md`의 시드 12점에 붙일 이미지를 **AI 이미지 생성으로 만든다.**
>
> **왜 스톡 이미지가 아니라 생성인가**
> ① 저작권·재배포 리스크가 0이다 — 만든 사람이 나다
> ② **12장이 한 아이의 화풍으로 보여야 하는데** 스톡으로는 통제할 수 없다
> ③ *"코 고는 소리도 그렸는데 안 보여?"* 같은 문장에 **정확히 맞는 그림**을 찾을 수 없다
> ④ **성장이 보여야 한다** — 3월은 서툴고 2월은 조금 나아진 그림. 스톡으로는 불가능하다
>
> 과제 안내문이 *"AI 도구 사용 내역을 README에 정리해 주세요"*라고 명시했으므로,
> 이것은 우회가 아니라 요건에 부합하는 선택이다. README §6에 도구와 용도를 적는다.

---

## 1. 공통 규칙 — 모든 프롬프트에 붙인다

12장이 **같은 아이가 같은 화구로 그린 것**처럼 보이려면 아래를 고정한다.

```
STYLE (append to every prompt):
a drawing made by a 5-year-old child, crayon and colored pencil on white paper,
wobbly uneven lines, colors going outside the lines, simple flat shapes,
no perspective, no shading, disproportionate figures,
photographed flat from directly above on a plain white desk, soft even daylight,
slight paper texture and a small crease, no frame, no border, no signature,
NOT professional, NOT polished, NOT detailed, NOT digital art, NOT vector
```

### 🔴 반드시 지킬 것

| | |
|---|---|
| **사람 얼굴 금지** | 실제 아이 사진처럼 보이는 것 금지. **그림 속 사람은 졸라맨 수준의 낙서**여야 한다 |
| **너무 잘 그리면 실패** | 이미지 모델은 자꾸 예쁘게 만든다. `NOT professional` 계열 부정어를 반드시 유지 |
| **글자 금지** | AI가 만든 한글은 대부분 깨진다. `no text, no letters, no numbers` 추가 |
| **정면 촬영** | 12장이 같은 각도여야 한 사람의 아카이브로 보인다 |

### 성장 표현 — 시기별로 이 문구를 섞는다

| 시기 | 추가 문구 |
|---|---|
| 3~6월 (더 어림) | `very simple, only 2-3 elements, huge empty white space, thick clumsy strokes` |
| 7~10월 (중간) | `a few more elements, still very simple` |
| 11~2월 (조금 자람) | `more elements and small details, still clearly childlike` |

---

## 2. 12장 개별 프롬프트

> 각 프롬프트 = **[장면] + [시기별 문구] + [공통 STYLE]**
> 파일명은 `public/seed/01.jpg` ~ `12.jpg`

### 01 — 3월 · *"엄마야. 머리가 길어서 이렇게 그렸어"*
```
A child's crayon drawing of a woman with very long hair that reaches the ground,
stick-figure body, big round head, simple smiling face with dot eyes,
very simple, only 2-3 elements, huge empty white space, thick clumsy strokes,
no text, no letters,
[STYLE]
```

### 02 — 4월 · *"이건 비 오는 날. 우산은 안 그렸어, 까먹었어"*
```
A child's crayon drawing of rain: many blue vertical dashes falling from a grey cloud,
one small stick figure standing in the rain with NO umbrella,
very simple, only 2-3 elements, huge empty white space, thick clumsy strokes,
no text, no letters,
[STYLE]
```

### 03 — 5월 · *"아빠가 자는 거야. 코 고는 소리도 그렸는데 안 보여?"* ⭐
```
A child's crayon drawing of a man lying down horizontally with eyes closed,
and a big zigzag squiggly line coming out of his nose to show snoring sound,
very simple, only 2-3 elements, huge empty white space, thick clumsy strokes,
no text, no letters,
[STYLE]
```
> 🔑 **이 한 장이 이 서비스의 증거다.** 그림만 보면 지그재그 선이 무엇인지 아무도 모른다.
> 아이의 설명이 있어야 비로소 읽힌다.

### 04 — 6월 · *"우리 집인데 문이 두 개야. 하나는 강아지 문"*
```
A child's crayon drawing of a simple house: square body, triangle roof,
TWO doors — one big door and one tiny small door next to it,
very simple, only 2-3 elements, huge empty white space, thick clumsy strokes,
no text, no letters,
[STYLE]
```

### 05 — 7월 · *"바다. 물이 이렇게 많은 건 처음 봤어"*
```
A child's crayon drawing where the bottom two thirds of the paper is filled
with thick blue horizontal scribbles representing a huge sea,
a tiny sun in the corner, a few more elements, still very simple,
no text, no letters,
[STYLE]
```

### 06 — 8월 · *"할머니 집 마당에 있는 나무. 매미가 여기 붙어 있었어"*
```
A child's crayon drawing of one big tree with a brown trunk and a green scribbled canopy,
one small brown oval bug drawn on the trunk,
a few more elements, still very simple,
no text, no letters,
[STYLE]
```

### 07 — 9월 · *"선생님이랑 나. 선생님이 더 커야 하는데 자리가 없었어"* ⭐
```
A child's crayon drawing of two stick figures side by side,
BOTH THE SAME HEIGHT, the one on the left slightly squeezed near the paper edge,
a few more elements, still very simple,
no text, no letters,
[STYLE]
```
> 🔑 **"자리가 없었어"**가 그림에서 읽혀야 한다. 오른쪽 끝에 눌린 느낌으로.

### 08 — 10월 · *"로봇인데 팔이 여섯 개야. 그래야 빨리 먹어"*
```
A child's crayon drawing of a robot made of rectangles,
with SIX arms sticking out from its body at different angles,
a few more elements, still very simple,
no text, no letters,
[STYLE]
```

### 09 — 11월 · *"내가 만든 공룡. 이빨은 종이 잘라서 붙였어"* ⭐ 유일한 입체물
```
A photograph of a child's handmade paper craft dinosaur,
made from green construction paper, roughly cut and glued,
with small white paper triangles glued on as teeth, visible glue marks and uneven cuts,
placed flat on a plain white desk, photographed from directly above, soft daylight,
clearly made by a young child, clumsy and imperfect,
no text, no letters, no hands, no people
```
> 🔑 **이 한 장만 사진이다.** 서비스가 그림만 받는 게 아니라 **만들기도 받는다**는 걸 보여준다.
> ⚠️ `[STYLE]`을 붙이지 않는다 (크레파스 그림이 아니므로)

### 10 — 12월 · *"눈사람. 진짜 눈으로 만들고 싶었는데 안 왔어"*
```
A child's crayon drawing of a snowman made of two white circles outlined in blue,
with a carrot nose and two stick arms, on a mostly empty white page,
more elements and small details, still clearly childlike,
no text, no letters,
[STYLE]
```

### 11 — 1월 · *"우리 가족이 다 있어. 강아지도 가족이야"*
```
A child's crayon drawing of four stick figures of different heights standing in a row,
and one small four-legged dog drawn at the same size as a person,
more elements and small details, still clearly childlike,
no text, no letters,
[STYLE]
```

### 12 — 2월 · *"나 여섯 살 됐어. 그래서 크게 그렸어"* ⭐ 마지막
```
A child's crayon drawing of ONE single figure drawn very large,
filling almost the entire paper from top to bottom, big round head, wide smile,
arms stretched out to both edges of the paper,
more elements and small details, still clearly childlike,
no text, no letters,
[STYLE]
```
> 🔑 **첫 장(작고 서툰 엄마 그림)과 나란히 놓으면 1년의 변화가 보인다.**

---

## 3. 생성 후 처리

```bash
# 1) 받은 파일을 01.jpg ~ 12.jpg로 이름 통일
# 2) 리사이즈 — 저장소 용량을 위해 긴 변 1200px, 품질 82
cd public/seed
for f in *.jpg; do sips -Z 1200 "$f" --setProperty formatOptions 82 >/dev/null; done
ls -lh    # 한 장당 200~400KB, 12장 합계 5MB 이내 목표
```

| 항목 | 기준 |
|---|---|
| 크기 | 긴 변 1200px |
| 형식 | JPG (PNG는 용량이 3~4배) |
| 합계 | **5MB 이내** — 저장소에 커밋되고 Docker 이미지에도 들어간다 |
| 위치 | `public/seed/` — 커밋한다. `next start`가 부팅 시 스캔하므로 클린 클론에서 살아남는다 |

---

## 4. README에 넣을 표기 (필수)

과제 안내문이 AI 도구 사용 내역을 요구한다. §6에 이렇게 적는다.

```markdown
### 시드 이미지

더미 데이터의 그림 12장은 **생성형 AI로 만들었습니다.**

- 실제 아이의 작품을 쓰지 않은 이유: 공개 저장소이고, 아동의 창작물과 초상은
  본인·보호자 동의 없이 배포할 수 없다고 판단했습니다.
- 무료 스톡 이미지를 쓰지 않은 이유: 12장이 **한 아이의 그림처럼 보여야** 하고,
  각 그림이 **아이의 설명과 정확히 맞아야** 하는데 스톡으로는 통제할 수 없었습니다.
- 사용 도구: (도구명·버전)
- 프롬프트 설계 기록: `docs/04b-image-prompts.md`
```

> **이 문단 자체가 점수다.** 안내문이 "의도적으로 넣지 않은 것과 그 이유"를 필수 항목으로 두었고,
> 여기서는 *"실제 아이 작품을 쓰지 않은 판단"*이 그 답이 된다.

---

## 5. 실패 시 후퇴

| 상황 | 대응 |
|---|---|
| 그림이 너무 잘 그려져서 아이 것 같지 않다 | 부정어를 늘린다: `NOT professional, NOT polished, NOT detailed, NOT artistic, drawn by a young child with no skill` |
| 글자가 들어간다 | `no text, no letters, no numbers, no words, no writing` 반복 |
| 12장 화풍이 제각각이다 | 첫 장을 참조 이미지로 주고 나머지를 생성하거나, 같은 세션에서 연속 생성 |
| 🔴 **생성 자체가 막힌다** | **직접 그린다.** 아이패드·종이 아무거나. 잘 그리면 오히려 실패라서 **부담이 가장 낮은 후퇴 경로**다 |

---

## 게이트 G4 (이미지)

- [ ] `public/seed/01.jpg` ~ `12.jpg` 존재
- [ ] 12장이 한 아이의 그림으로 보인다
- [ ] 3월과 2월을 나란히 놓았을 때 **자란 것이 보인다**
- [ ] 03(코 고는 소리)·07(자리가 없었어)·09(종이 공룡)이 **문장과 맞는다**
- [ ] 합계 5MB 이내
- [ ] 글자·실제 사람 얼굴 없음
