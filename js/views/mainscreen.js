// 큰 화면(프로젝터). 주소: #/main  · 단계는 운영 콘솔에서 넘깁니다.
import { watch } from '../store.js';
import { TITLE, CENTER_Q, CONCLUSION, SENTENCE_STEM, TOPICS, LANES, laneOf } from '../content.js';
import { cfgOf, stateOf, stepOf, remain, notesOf, membersOf, byLikes, GROUPS } from '../model.js';
import { $, esc, fmtMs, qrSvg, link, keepAwake, beep } from '../common.js';

export default function mainscreen(root, arg, d) {
  let ev = {}, groups = {}, lastR = null, lastKey = null;
  document.title = '큰 화면 · AI와 함께 생각하며 배우기';
  keepAwake(d);

  root.innerHTML = `<div class="ms">
    <header class="ms-top"><div class="ms-title"><small>${esc(TITLE)}</small><b id="mstep"></b></div><div class="ms-timer mono" id="mtimer"></div></header>
    <div class="ms-body" id="mbody"></div>
    <footer class="ms-foot" id="mfoot"></footer>
  </div>`;

  const notes = g => notesOf(groups[g], null, g).filter(n => !n.hid);

  function render() {
    const cfg = cfgOf(ev), st = stateOf(ev), s = stepOf(st);
    if (s.key !== lastKey) { lastKey = s.key; lastR = null; }
    $('#mstep', root).textContent = `${st.step + 1}. ${s.name}`;
    $('#mfoot', root).textContent = s.say;
    const el = $('#mbody', root);

    if (s.key === 'pick') {
      el.innerHTML = `<div class="ms-pick">
        <div class="ms-qr">${qrSvg(link('/join'))}<p>휴대전화 카메라로 찍고<br><b>희망하는 주제</b>를 고르세요</p><small>${esc(location.host)}</small></div>
        <div class="ms-topics">${TOPICS.map(t => {
          const n = membersOf(groups[t.id]).length;
          return `<div class="ms-topic ${t.cls} ${n >= cfg.cap ? 'full' : ''}"><span class="tp-n">${t.id}</span>
            <div class="mt-txt"><b>${esc(t.title)}</b><p>${esc(t.q)}</p></div>
            <div class="mt-seat"><b>${n}</b><small>/ ${cfg.cap}명</small>${n >= cfg.cap ? '<em>마감</em>' : ''}</div></div>`;
        }).join('')}</div></div>`;
      return;
    }

    if (s.key === 'share' || s.key === 'close') {
      el.innerHTML = `${s.key === 'close' ? `<div class="ms-close"><p>${esc(CENTER_Q)}</p><h1>“${esc(CONCLUSION)}”</h1></div>` : ''}
        <div class="ms-sents ${s.key === 'close' ? 'small' : ''}">${TOPICS.map(t => {
          const top = notes(t.id).sort(byLikes).slice(0, s.key === 'close' ? 0 : 2);
          const sent = (groups[t.id]?.sentence || '').trim();
          return `<div class="ms-sent ${t.cls}"><div class="ms-sent-h"><span class="tp-n">${t.id}</span><b>${esc(t.title)}</b></div>
            <p class="ms-sent-t">${esc(SENTENCE_STEM)} <b>${sent ? esc(sent) : '<span class="muted">…</span>'}</b></p>
            ${top.map(n => `<div class="ms-mini ${laneOf(n.l).cls}"><span>${laneOf(n.l).icon}</span>${esc(n.t)}<em>♥ ${n.likeN}</em></div>`).join('')}</div>`;
        }).join('')}</div>`;
      return;
    }

    // 혼자 생각 · 분임 대화 · 한 문장: 다섯 분임 현황
    el.innerHTML = `<div class="ms-groups">${TOPICS.map(t => {
      const list = notes(t.id);
      const stars = list.filter(n => n.star).sort(byLikes).slice(0, 3);
      const latest = stars.length ? stars : [...list].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 3);
      const sent = (groups[t.id]?.sentence || '').trim();
      return `<div class="ms-g ${t.cls}">
        <div class="ms-g-h"><span class="tp-n">${t.id}</span><b>${esc(t.title)}</b><small>${membersOf(groups[t.id]).length}명</small></div>
        <div class="ms-counts">${LANES.map(l => `<span class="${l.cls}" title="${esc(l.name)}">${l.icon} ${list.filter(n => laneOf(n.l).key === l.key).length}</span>`).join('')}</div>
        <div class="ms-g-list">${latest.map(n => `<div class="ms-mini ${laneOf(n.l).cls}">${n.star ? '★ ' : ''}${esc(n.t)}</div>`).join('') || '<p class="muted small">아직 카드가 없어요</p>'}</div>
        ${s.key === 'sentence' ? `<p class="ms-g-sent">${esc(SENTENCE_STEM)} <b>${esc(sent) || '…'}</b></p>` : ''}
      </div>`;
    }).join('')}</div>`;
  }

  function tick() {
    const st = stateOf(ev), r = remain(st);
    const el = $('#mtimer', root);
    el.textContent = r == null ? '' : fmtMs(r);
    el.classList.toggle('late', r != null && r <= 0);
    el.classList.toggle('paused', st.paused);
    if (!st.paused && lastR != null && lastR > 0 && r != null && r <= 0) beep(2);
    lastR = r;
  }
  d.every(500, tick);

  d(watch('event', v => { ev = v; render(); tick(); }));
  GROUPS.forEach(g => d(watch(`group/${g}`, v => { groups[g] = v; render(); })));
}
