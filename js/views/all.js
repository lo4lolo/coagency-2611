// 모든 분임 보기(공감하기). 주소: #/all
// 수업 중 '함께 보기' 단계나, 운영 콘솔에서 '공감만 받기'를 켠 뒤(수업 후)에 씁니다. 자리 잡기 없이 누구나 볼 수 있습니다.
import { watch, patch, DEL } from '../store.js';
import { TITLE, CENTER_Q, CONCLUSION, SENTENCE_STEM, TOPICS, LANES, laneOf } from '../content.js';
import { cfgOf, notesOf, byLikes, GROUPS } from '../model.js';
import { $, esc, cid, toast, card } from '../common.js';

export default function all(root, arg, d) {
  const me = cid();
  let ev = {}, groups = {}, filter = 0, lane = '';
  root.innerHTML = `<main class="allv">
    <header class="j-top"><a class="p-home" href="#/" aria-label="처음 화면">⌂</a><div><b>${esc(TITLE)}</b><small>모든 분임 보기 · ♥ 공감하기</small></div></header>
    <div id="anote" class="notice" hidden></div>
    <p class="center-q sm">${esc(CENTER_Q)}</p>
    <section class="all-sents" id="asents"></section>
    <nav class="chips" id="afilter" aria-label="분임 고르기"></nav>
    <nav class="chips" id="alane" aria-label="칸 고르기"></nav>
    <p class="small muted" id="acount"></p>
    <div class="all-cards" id="alist"></div>
    <p class="concl">“${esc(CONCLUSION)}”</p>
  </main>`;

  function render() {
    const cfg = cfgOf(ev);
    const note = cfg.likeOnly ? '지금은 공감만 할 수 있습니다. 마음에 닿는 카드에 ♥를 눌러 주세요.' : cfg.notice.trim();
    $('#anote', root).hidden = !note; $('#anote', root).textContent = note;
    $('#asents', root).innerHTML = TOPICS.map(t => {
      const s = (groups[t.id]?.sentence || '').trim();
      return `<div class="as ${t.cls}"><span class="tp-n">${t.id}</span><div><small>${esc(t.title)}</small><p>${esc(SENTENCE_STEM)} <b>${s ? esc(s) : '…'}</b></p></div></div>`;
    }).join('');
    $('#afilter', root).innerHTML = [`<button class="chip ${!filter ? 'on' : ''}" data-f="0">전체</button>`,
      ...TOPICS.map(t => `<button class="chip ${t.cls} ${filter === t.id ? 'on' : ''}" data-f="${t.id}">${t.id}. ${esc(t.title)}</button>`)].join('');
    $('#alane', root).innerHTML = [`<button class="chip ${!lane ? 'on' : ''}" data-l="">모든 칸</button>`,
      ...LANES.map(l => `<button class="chip ${l.cls} ${lane === l.key ? 'on' : ''}" data-l="${l.key}">${l.icon} ${esc(l.short)}</button>`)].join('');
    const list = GROUPS.filter(g => !filter || g === filter).flatMap(g => notesOf(groups[g], me, g)).filter(n => !n.hid && (!lane || laneOf(n.l).key === lane)).sort(byLikes);
    $('#acount', root).textContent = `카드 ${list.length}장 · 공감 많은 순`;
    $('#alist', root).innerHTML = list.map(n => card(n, { group: true })).join('') || '<p class="empty">아직 카드가 없어요</p>';
  }

  d(watch('event', v => { ev = v; render(); }));
  GROUPS.forEach(g => d(watch(`group/${g}`, v => { groups[g] = v; render(); })));

  d.on(root, 'click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.f != null) { filter = Number(b.dataset.f); render(); return; }
    if (b.dataset.l != null) { lane = b.dataset.l; render(); return; }
    if (b.dataset.like) {
      const g = Number(b.dataset.g), id = b.dataset.like;
      const liked = !!groups[g]?.likes?.[id]?.[me];
      patch(`group/${g}`, { likes: { [id]: { [me]: liked ? DEL : true } } }).catch(() => toast('연결을 확인해 주세요'));
    }
  });
}
