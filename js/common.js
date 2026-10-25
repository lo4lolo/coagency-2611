// 화면 공통 도구
import { LANES, laneOf } from './content.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function lsGet(k, d = null) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }
export function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* 사생활 보호 모드 */ } }

/** 이 기기의 익명 참여자 번호(이름은 받지 않음) */
let memCid;
export function cid() {
  let v = lsGet('ca_cid');
  if (!v) { v = memCid ||= Math.random().toString(36).slice(2, 12); lsSet('ca_cid', v); }
  return v;
}

export function fmtMs(ms) {
  if (ms == null) return '--:--';
  if (ms <= 0) return '0:00';
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function toast(msg, opt) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.append(el); }
  el.innerHTML = '';
  el.append(msg);
  if (opt?.action) {
    const b = document.createElement('button');
    b.textContent = opt.action;
    b.onclick = () => { el.classList.remove('show'); opt.onAction?.(); };
    el.append(b);
  }
  el.classList.toggle('has-action', !!opt?.action);
  el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), opt?.action ? 5000 : 2400);
}

/** 화면이 꺼지지 않게(진행자 노트북·큰 화면) */
export function keepAwake(d) {
  let lock = null;
  const get = async () => { try { if (document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen'); } catch { /* 지원 안 함 */ } };
  get();
  d.on(document, 'visibilitychange', get);
  d(() => { lock?.release?.().catch(() => {}); });
}

/** 짧은 알림음. 화면을 한 번 누른 뒤부터 납니다(브라우저 정책) */
let actx;
export function beep(times = 2) {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    for (let k = 0; k < times; k++) {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + k * 0.32;
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + 0.27);
    }
  } catch { /* 소리를 낼 수 없는 환경 */ }
}

export const link = hash => location.origin + location.pathname + location.search + '#' + hash;

export function qrSvg(text) {
  if (!window.qrcode) return `<div class="qr-fallback">${esc(text)}</div>`;
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

/** 간이 PIN 잠금(이 기기에 기억) */
export const unlocked = kind => lsGet('ca_pin_' + kind) === '1';
export function pinGate(root, kind, pin, title, onOk) {
  if (unlocked(kind)) return onOk();
  root.innerHTML = `<main class="gate"><form class="card">
    <h1>${esc(title)}</h1><p class="muted">진행용 PIN을 입력하세요.</p>
    <input id="pin" inputmode="numeric" autocomplete="off" placeholder="PIN" aria-label="PIN">
    <button class="btn primary">열기</button><p class="muted small"><a href="#/">처음 화면으로</a></p></form></main>`;
  $('input', root).focus();
  $('form', root).onsubmit = e => {
    e.preventDefault();
    if ($('#pin', root).value.trim() === pin) { lsSet('ca_pin_' + kind, '1'); onOk(); }
    else toast('PIN이 맞지 않습니다');
  };
}

/**
 * 대화판 카드
 * like: 공감 버튼 / mine: 내 카드(수정·삭제) / tools: 진행자 도구(★·칸 옮기기·수정·삭제)
 * group: 분임 번호와 칸 표시 / fresh: 새 카드 강조
 */
export function card(n, { like = true, mine = false, tools = false, group = false, fresh = false } = {}) {
  const l = laneOf(n.l);
  const meta = [group ? `<b>${n.g}분임</b>` : '', group ? `<span class="tag ${l.cls}">${l.icon} ${l.short}</span>` : '',
    mine ? '<span class="mine-tag">내 의견</span>' : '', n.a === 'facil' ? '<span class="muted">진행자 입력</span>' : '',
    n.star ? '<span class="star-mark">★ 핵심</span>' : '', n.ed ? '<span class="muted">수정됨</span>' : ''].filter(Boolean).join('');
  return `<article class="cn ${l.cls} ${n.star ? 'star' : ''} ${mine ? 'mine' : ''} ${fresh ? 'fresh' : ''}" data-id="${n.id}" data-g="${n.g ?? ''}" ${tools ? 'draggable="true"' : ''}>
    ${meta ? `<div class="cn-meta">${meta}</div>` : ''}
    <p>${esc(n.t)}</p>
    <div class="cn-foot">
      ${like ? `<button class="like ${n.liked ? 'on' : ''}" data-like="${n.id}" data-g="${n.g ?? ''}" aria-pressed="${!!n.liked}" aria-label="공감">♥ <b>${n.likeN}</b></button>` : `<span class="like-n">♥ ${n.likeN}</span>`}
      ${mine ? `<span class="own"><button data-edit="${n.id}">✏️ 수정</button><button data-del="${n.id}">🗑 삭제</button></span>` : ''}
      ${tools ? `<span class="cn-tools">
        <button data-star="${n.id}" title="${n.star ? '핵심 해제' : '핵심 의견으로'}">${n.star ? '★' : '☆'}</button>
        <select data-move="${n.id}" title="다른 칸으로 옮기기" aria-label="칸 옮기기">${LANES.map(x => `<option value="${x.key}" ${x.key === l.key ? 'selected' : ''}>${x.icon} ${x.short}</option>`).join('')}</select>
        ${n.a === 'facil' ? `<button data-fedit="${n.id}" title="수정(진행자 입력 카드만)">✏️</button>` : ''}
        <button data-hide="${n.id}" title="삭제(되돌리기 가능)">🗑</button></span>` : ''}
    </div></article>`;
}

/** 새로 들어온 카드 찾기(처음 한 번은 강조하지 않음) */
export function freshTracker() {
  let seen = null;
  return list => {
    const ids = list.map(n => n.id);
    if (!seen) { seen = new Set(ids); return new Set(); }
    const fresh = new Set(ids.filter(id => !seen.has(id)));
    ids.forEach(id => seen.add(id));
    return fresh;
  };
}

/** 해제 함수 모음(화면을 옮길 때 구독·타이머 정리) */
export function disposer() {
  const fns = [];
  const d = fn => (fns.push(fn), fn);
  d.every = (ms, fn) => { const id = setInterval(fn, ms); fns.push(() => clearInterval(id)); };
  d.on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); fns.push(() => el.removeEventListener(ev, fn, opt)); };
  d.run = () => fns.splice(0).forEach(f => { try { f(); } catch (e) { console.error(e); } });
  return d;
}

export function download(name, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([type.startsWith('text/csv') ? '﻿' + text : text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const csv = rows => rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
