/**
 * 앱의 "지금"은 여기서만 만든다.
 *
 * 🔑 왜 규칙까지 걸어 막는가 (eslint.config.mjs의 no-restricted-syntax)
 *   한 번의 요청 안에서 new Date()를 여러 곳에서 부르면 각각 다른 순간이 된다.
 *   평소엔 몇 밀리초 차이라 안 보이다가, 자정을 걸치는 순간 **날짜가 서로 달라진다.**
 *   이 서비스는 "만든 날"이 핵심 필드라 그 하루가 곧 데이터의 정확성이다.
 *
 *   입구를 하나로 두면 테스트에서 시간을 고정하기도 쉽다 — 부르는 쪽이
 *   getNow()의 결과를 인자로 받도록 짜여 있기 때문이다.
 */

// 이 한 줄이 앱 전체에서 유일하게 허용된 "지금"이다.
// eslint-disable-next-line no-restricted-syntax
export const getNow = (): Date => new Date();
