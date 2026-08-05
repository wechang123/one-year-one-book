/**
 * 검색어에서 매칭된 부분을 강조한다.
 *
 * 🔑 강조가 없으면 **왜 찾혔는지 모른다.**
 *   말이 두세 문장짜리라 결과만 보면 어느 낱말이 걸렸는지 안 보이고,
 *   그러면 사용자는 검색이 제대로 동작했는지 판단할 수 없다.
 *
 * 🔑 격자(서버)와 구(클라이언트)가 같이 쓴다. 지시어가 없는 순수 함수라
 *   어느 쪽에서 불러도 그쪽의 일부가 된다.
 */
export function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let from = 0;
  for (;;) {
    const at = lower.indexOf(needle, from);
    if (at === -1) break;
    if (at > from) out.push(text.slice(from, at));
    out.push(<mark key={at}>{text.slice(at, at + q.length)}</mark>);
    from = at + q.length;
  }
  out.push(text.slice(from));
  return out;
}
