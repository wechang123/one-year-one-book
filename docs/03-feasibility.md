# 03. 타당성 분석

> 2026-08-02 · 경제적 · 기술적 · 법적 3축. 웹 조사 후 종합.
> 확인하지 못한 것은 "확인 못 함"으로 남겼다. 근거 없는 수치는 쓰지 않았다.

---

`/Users/yuwichang/kid-archive/docs/03-feasibility.md` 작성 완료 (약 420줄, 미커밋).

**구성**
1. **경제** — 유사 서비스 8종 생존/과금 표(원문 확인), Artsonia 자사 발표 수치, 2025 교육기본통계 감소율, 물량 패턴(등록 산발·주문 집중), 설계를 바꾼 발견 2건(리틀피카소 음성 선점 → 차별점을 "버릴 수 있게 하는 것"으로 이동 / 키즈노트 85,000기관 → B2C 정면승부 배제). 확인 못 한 것 4건 명시.
2. **기술** — 실측 5건을 표로: `public/`은 부팅 시점 스캔이라 시드는 살아남고 업로드는 404(볼륨으로 안 고쳐짐) → **DB `Bytes` + route handler** 확정, `bodySizeLimit` 1MB 벽(이미 8mb 적용됨), sharp가 이미 있음.
3. **법 (실행 지침)** — Commons CC0/PD-self 12장 확정표 + 복붙 가능한 `curl` 스크립트 + README 출처 표기 블록 전문. "저작권 두 겹" 함정과 `PD-USGov-EPA` 오적용 배제 사례. OSS는 **이 저장소의 `package-lock.json`을 직접 파싱한 실측**으로 교체.
4. **종합 판정** — 3축 판정 + 순서 있는 행동 7개 + 하지 말 것 + 게이트 G3.

**조사 문서에 없던, lock 파싱으로 새로 확인한 사실** (조사 문서의 "latest 버전" 가정과 다르므로 이 값이 정본):
- `sharp@0.34.5`는 **직접 의존성이 아니라 `next@16.2.12`의 `optionalDependencies`** — 뺄 수 없음
- `@img/sharp-libvips-*@1.2.4` **10개가 LGPL-3.0-or-later**로 이미 production에 존재 (조사 문서는 1.3.2로 추정)
- production 207개 중 **GPL·AGPL·SSPL·UNLICENSED 0건**
- 조사 문서에 없던 항목 3건 발견: `elkjs` **EPL-2.0** (prisma→studio-core), `seq-queue` **라이선스 필드 없음** (prisma→mysql2), `caniuse-lite` CC-BY-4.0 (next)
- `@prisma/studio-core@0.33.0`은 Apache-2.0 정상 (2025-12 UNLICENSED 사고 미해당)
- `typescript`는 6.0.3, **Tailwind·UI 라이브러리는 현재 미설치** — 조사 문서의 Tailwind 권고는 "도입하지 않는다"로 반영

**미해결 2건 (문서에 🔴로 표기)**
- 이미지 12장 **다운로드 미실행** — 임계 경로. `04-content.md §5`의 빈칸이 이것 하나
- 과제 안내문 원문의 **라이선스·제출물 활용 권리 조항 미확인** — `LICENSE` 커밋 전 확인 필요 조건으로 명시