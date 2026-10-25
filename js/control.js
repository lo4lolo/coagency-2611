// 진행 조작(운영 콘솔)과 선착순 자리 잡기
import { patch, transact, DEL } from './store.js';
import { STEPS } from './content.js';
import { cfgOf, stateOf, remain } from './model.js';

/** 단계로 이동. 시간이 정해진 단계면 타이머가 바로 시작됩니다 */
export function stepGo(ev, k) {
  const cfg = cfgOf(ev);
  const step = Math.min(Math.max(k, 0), STEPS.length - 1);
  const min = cfg.dur[step];
  return patch('event', { state: { step, endsAt: min ? Date.now() + min * 60000 : null, paused: false, remain: null } });
}
export function timerToggle(ev) {
  const st = stateOf(ev);
  if (st.endsAt == null && st.remain == null) return Promise.resolve();
  if (st.paused) return patch('event', { state: { paused: false, endsAt: Date.now() + (st.remain || 0), remain: null } });
  return patch('event', { state: { paused: true, remain: remain(st), endsAt: null } });
}
export function timerAdd(ev, min) {
  const st = stateOf(ev);
  if (st.paused) return patch('event', { state: { remain: Math.max(0, (st.remain || 0) + min * 60000) } });
  const base = st.endsAt == null ? Date.now() : Math.max(st.endsAt, Date.now());
  return patch('event', { state: { endsAt: Math.max(Date.now(), base + min * 60000) } });
}

/**
 * 선착순 자리 잡기. prev 는 지금 앉아 있는 분임(없으면 0).
 * 안 되면 Error 를 던집니다: 'full'(정원 참) / 'closed'(주제 이동 마감)
 * 이동 마감 뒤에도 아직 자리가 없는 사람(늦게 온 분)은 빈자리가 있는 분임에 들어갈 수 있습니다.
 */
export function takeSeat(me, target, prev) {
  const moving = prev && prev !== target;
  const paths = ['event', `group/${target}`, ...(moving ? [`group/${prev}`] : [])];
  // 동시에 눌러 보안 규칙(정원)에 막힌 경우도 '자리 없음'으로 안내
  const asFull = e => { throw e?.code === 'permission-denied' ? new Error('full') : e; };
  return transact(paths, ([ev, tg, pv]) => {
    const cfg = cfgOf(ev);
    const members = tg.members || {};
    if (members[me]) return {};
    const reallyMoving = moving && pv?.members?.[me];
    if (reallyMoving && !cfg.open) throw new Error('closed');
    if (Object.keys(members).length >= cfg.cap) throw new Error('full');
    const out = { [`group/${target}`]: { members: { [me]: { t: Date.now() } } } };
    if (reallyMoving) out[`group/${prev}`] = { members: { [me]: DEL } };
    return out;
  }).catch(asFull);
}
export const leaveSeat = (me, g) => patch(`group/${g}`, { members: { [me]: DEL } });
