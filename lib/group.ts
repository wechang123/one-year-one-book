/**
 * 목록을 해 단위로 묶는다.
 *
 * 🔑 왜 하필 해인가
 *   이 서비스의 산출물이 `한 해가 한 권`이다. 화면이 묶는 단위와 책이 묶는 단위가
 *   같으면, 목록에서 본 덩어리가 그대로 한 권이 된다 — 사용자가 두 가지 단위를
 *   머릿속에서 옮겨 담지 않아도 된다.
 *
 * 🔑 왜 더 잘게 안 자르나 (달 단위)
 *   이 앱의 목록은 **점이 적고 여러 해에 흩어져 있다**(시드가 12점 / 8년).
 *   그 모양에서 달로 자르면 제목만 남고 아래가 비는 칸이 줄줄이 생긴다.
 *   같은 증상이 immich에도 올라와 있다 — 사진이 적은 앨범에서 달 그룹이
 *   빈 공간만 만든다는 것(immich-app/immich discussions #13845).
 *   해가 이 데이터 밀도에 맞는 가장 작은 단위다.
 */

export type YearGroup<T> = { year: number; items: T[] };

/**
 * 🔑 **정렬하지 않는다.** 들어온 순서를 그대로 두고 이웃한 같은 해만 접는다.
 *   순서는 쿼리가 이미 정했고(`orderBy: [madeOn desc, createdAt desc]`),
 *   여기서 또 정하면 순서를 정하는 곳이 둘이 된다. 두 곳은 갈라진다.
 *   그래서 이 함수는 정렬된 입력을 **전제**하지, 보장하지 않는다.
 *
 * 🔑 해는 UTC로 읽는다. `madeOn`은 date 컬럼이라 전부 UTC 자정이고,
 *   지역 시간으로 읽으면 1월 1일이 옆 해로 샌다.
 */
export function groupByYear<T extends { madeOn: Date }>(items: T[]): YearGroup<T>[] {
  const groups: YearGroup<T>[] = [];
  for (const item of items) {
    const year = item.madeOn.getUTCFullYear();
    const open = groups[groups.length - 1];
    if (open && open.year === year) open.items.push(item);
    else groups.push({ year, items: [item] });
  }
  return groups;
}
