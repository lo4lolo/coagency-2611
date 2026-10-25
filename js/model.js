// 설정·단계·타이머·카드 계산
import { STEPS, TOPICS } from './content.js';

export const GROUPS = TOPICS.map(t => t.id);
export const DEFAULT_CAP = 6;

export function cfgOf(ev) {
  const c = ev?.config || {};
  const dur = {};
  STEPS.forEach((s, i) => { dur[i] = Number(c.dur?.[i] ?? s.min) || 0; });
  return { cap: Number(c.cap) || DEFAULT_CAP, open: c.open !== false, likeOnly: !!c.likeOnly, notice: c.notice || '', dur };
}
export function stateOf(ev) {
  const s = ev?.state || {};
  return { step: Number.isInteger(s.step) ? s.step : 0, endsAt: s.endsAt ?? null, paused: !!s.paused, remain: s.remain ?? null };
}
/** 남은 시간(ms). 타이머가 없으면 null */
export function remain(st) {
  if (st.paused) return st.remain;
  return st.endsAt == null ? null : st.endsAt - Date.now();
}
export const stepOf = st => STEPS[Math.min(Math.max(st.step, 0), STEPS.length - 1)];

export const membersOf = gd => Object.keys(gd?.members || {});
/** 분임 문서에서 카드 목록. me 를 주면 liked 표시 */
export function notesOf(gd, me, g) {
  const likes = gd?.likes || {};
  return Object.entries(gd?.notes || {}).map(([id, n]) => {
    const lk = likes[id] || {};
    return { ...n, id, g, likeN: Object.keys(lk).length, liked: !!(me && lk[me]) };
  });
}
export const byOld = (a, b) => (a.ts || 0) - (b.ts || 0);
export const byLikes = (a, b) => b.likeN - a.likeN || (b.star ? 1 : 0) - (a.star ? 1 : 0) || byOld(a, b);
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
