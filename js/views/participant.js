// 참여자 대화판. 주소: #/g/3
import { watch, patch, DEL } from '../store.js';
import { LANES, laneOf, topicOf, SENTENCE_STEM, STEPS } from '../content.js';
import { cfgOf, stateOf, stepOf, remain, notesOf, membersOf, byOld, byLikes, newId, GROUPS } from '../model.js';
import { $, $$, esc, cid, fmtMs, toast, card, freshTracker, lsGet, lsSet } from '../common.js';
import { takeSeat } from '../control.js';

export default function participant(root, arg, d) {
  const G = Number(arg);
  const T = topicOf(G);
  if (!T) { location.hash = '#/join'; return; }
  const me = cid();
  let ev = {}, gd = {}, all = {}, tab = 'mine', wLane = '', editId = null, lastStep = null, likeOnly = false;
  const fresh = freshTracker();

  root.innerHTML = `<div class="p">
    <header class="p-top ${T.cls}"><a class="p-home" href="#/join" aria-label="주제 고르기">⌂</a>
      <div class="p-ttl"><small>${G}분임</small><b>${esc(T.title)}</b></div>
      <div class="p-now" id="pnow"></div></header>
    <div id="pnote" class="notice" hidden></div>
    <section class="p-q ${T.cls}"><p>${esc(T.q)}</p>
      <details><summary>함께 생각해 볼 질문</summary><ul>${T.sub.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details></section>
    <div id="pseat"></div>
    <div id="pstep" class="p-step"></div>
    <nav class="p-tabs" id="ptabs"><button data-tab="mine">우리 분임</button><button data-tab="all">모든 분임 보기</button></nav>
    <div id="psent"></div>
    <div id="pbody"></div>
    <button class="fab" id="pwrite">+ 의견 쓰기</button>
    <dialog id="dw"><form method="dialog" class="dlg">
      <h3 id="dwt">의견 쓰기</h3>
      <p class="lbl">어느 칸에 붙일까요?</p>
      <div class="seg lanes-pick" id="wlane">${LANES.map(l => `<button type="button" class="${l.cls}" data-wlane="${l.key}">${l.icon} ${l.short}<small>${esc(l.name)}</small></button>`).join('')}</div>
      <p class="small muted" id="whint">칸을 골라 주세요.</p>
      <textarea id="wtext" rows="3" maxlength="200" placeholder="한두 문장으로 적어 주세요"></textarea>
      <div class="row end"><span class="small muted" id="wcount">0/200</span><button class="btn ghost" value="cancel">닫기</button><button class="btn primary" type="button" id="wsend">올리기</button></div>
    </form></dialog>
  </div>`;

  const isMember = () => !!gd.members?.[me];

  function render() {
    const cfg = cfgOf(ev), st = stateOf(ev), s = stepOf(st);
    if (s.key !== lastStep) { if (lastStep && ['share', 'close'].includes(s.key)) tab = 'all'; lastStep = s.key; }
    syncAll();
    const note = cfg.notice.trim();
    $('#pnote', root).hidden = !note; $('#pnote', root).textContent = note;
    $('#pstep', root).innerHTML = cfg.likeOnly ? '<b>공감만 받기</b> 쓰기는 마감되었습니다. 마음에 닿는 카드에 ♥를 눌러 주세요.' : `<b>${st.step + 1}. ${esc(s.name)}</b> ${esc(s.say)}`;
    const n = membersOf(gd).length;
    $('#pseat', root).innerHTML = isMember() || cfg.likeOnly ? ''
      : `<div class="seat-warn"><p>아직 이 분임에 자리를 잡지 않았어요. ${n >= cfg.cap ? '<b>자리가 다 찼습니다.</b>' : `(${n}/${cfg.cap}명)`}</p>
        <div class="row">${n < cfg.cap ? `<button class="btn primary" data-a="seat">이 분임으로 들어가기</button>` : ''}<a class="btn" href="#/join">주제 고르기</a></div></div>`;
    $('#pwrite', root).hidden = !isMember() || tab !== 'mine' || s.key === 'close' || cfg.likeOnly;
    likeOnly = cfg.likeOnly;
    $$('#ptabs button', root).forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const sent = (gd.sentence || '').trim();
    $('#psent', root).innerHTML = tab === 'mine' && sent ? `<div class="sent-card ${T.cls}"><small>우리 분임 한 문장</small><p>${esc(SENTENCE_STEM)} <b>${esc(sent)}</b></p></div>` : '';
    renderBody();
    tick();
  }

  function renderBody() {
    const el = $('#pbody', root);
    if (tab === 'all') {
      el.innerHTML = GROUPS.map(g => {
        const t = topicOf(g), x = all[g] || {};
        const list = notesOf(x, me, g).filter(n => !n.hid).sort(byLikes);
        const sent = (x.sentence || '').trim();
        return `<section class="all-g ${t.cls}"><div class="all-h"><span class="tp-n">${g}</span><b>${esc(t.title)}</b><span class="cnt">${list.length}</span></div>
          ${sent ? `<p class="all-sent">${esc(SENTENCE_STEM)} <b>${esc(sent)}</b></p>` : ''}
          <div class="lane-body">${list.map(n => card(n, { group: true, mine: false })).join('') || '<p class="lane-empty">아직 의견이 없어요</p>'}</div></section>`;
      }).join('');
      return;
    }
    const list = notesOf(gd, me, G).filter(n => !n.hid);
    const isNew = fresh(list);
    const sort = ['share', 'close', 'sentence'].includes(stepOf(stateOf(ev)).key) ? byLikes : byOld;
    el.innerHTML = `<div class="lanes p-lanes">${LANES.map(l => {
      const items = list.filter(n => laneOf(n.l).key === l.key).sort(sort);
      return `<section class="lane ${l.cls}"><div class="lane-h"><b>${l.icon} ${esc(l.name)}</b><span class="cnt">${items.length}</span></div>
        <div class="lane-body">${items.map(n => card(n, { mine: n.a === me && !likeOnly, fresh: isNew.has(n.id) && n.a !== me })).join('') || `<p class="lane-empty">${esc(l.hint)}</p>`}</div></section>`;
    }).join('')}</div>`;
  }

  function tick() {
    const st = stateOf(ev), r = remain(st);
    $('#pnow', root).innerHTML = r == null ? `<small>${st.step + 1}단계</small>` : `<span class="${r <= 0 ? 'late' : ''}">${fmtMs(r)}</span>`;
  }
  d.every(1000, tick);

  d(watch('event', v => { ev = v; render(); }));
  d(watch(`group/${G}`, v => { gd = v; render(); }));
  // 모든 분임 보기: 그 탭을 열었을 때만 다른 분임을 구독(읽기 횟수 절약)
  let allOffs = [];
  function syncAll() {
    if (tab === 'all' && !allOffs.length) allOffs = GROUPS.map(g => g === G ? () => {} : watch(`group/${g}`, v => { all[g] = v; if (tab === 'all') renderBody(); }));
    if (tab !== 'all' && allOffs.length) { allOffs.forEach(f => f()); allOffs = []; }
    all[G] = gd;
  }
  d(() => allOffs.forEach(f => f()));

  // ── 의견 쓰기 ──
  function openWrite(n) {
    const s = stepOf(stateOf(ev));
    editId = n?.id || null;
    wLane = n ? laneOf(n.l).key : '';
    $('#wtext', root).value = n ? n.t : $('#wtext', root).value;
    $('#wcount', root).textContent = `${$('#wtext', root).value.length}/200`;
    $('#dwt', root).textContent = n ? '내 의견 고치기' : '의견 쓰기';
    $('#wsend', root).textContent = n ? '고치기' : '올리기';
    if (!n && s.key === 'pick') toast('아직 주제 고르기 시간이지만, 미리 올려도 됩니다');
    renderWrite(); $('#dw', root).showModal();
  }
  function renderWrite() {
    $$('#wlane button', root).forEach(b => b.classList.toggle('on', b.dataset.wlane === wLane));
    $('#whint', root).textContent = wLane ? laneOf(wLane).hint : '칸을 골라 주세요.';
  }
  function send() {
    const ta = $('#wtext', root), text = ta.value.trim();
    if (!wLane) return toast('어느 칸에 붙일지 골라 주세요');
    if (!text) return toast('의견을 적어 주세요');
    const p = editId
      ? patch(`group/${G}`, { notes: { [editId]: { l: wLane, t: text, ed: true } } })
      : patch(`group/${G}`, { notes: { [newId()]: { l: wLane, t: text, a: me, ts: Date.now() } } });
    p.catch(() => toast('저장하지 못했습니다. 다시 눌러 주세요'));
    const was = !!editId;
    editId = null; ta.value = ''; $('#wcount', root).textContent = '0/200';
    $('#dw', root).close();
    tab = 'mine'; render();
    toast(was ? '고쳤습니다' : '올렸습니다. 다른 분 의견에 ♥ 공감도 눌러 주세요');
  }

  d.on(root, 'click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const ds = b.dataset;
    if (ds.tab) { tab = ds.tab; render(); return; }
    if (ds.a === 'seat') {
      takeSeat(me, G, Number(lsGet('ca_seat')) || 0)
        .then(() => { lsSet('ca_seat', String(G)); toast(`${G}분임에 들어왔습니다`); })
        .catch(err => toast(err.message === 'full' ? '자리가 다 찼습니다' : err.message === 'closed' ? '주제 이동이 마감되었습니다' : '연결을 확인해 주세요'));
      return;
    }
    if (likeOnly && (b.id === 'pwrite' || ds.edit || ds.del)) return toast('지금은 공감만 할 수 있습니다');
    if (b.id === 'pwrite') return openWrite();
    if (b.id === 'wsend') return send();
    if (ds.wlane) { wLane = ds.wlane; renderWrite(); $('#wtext', root).focus(); return; }
    if (ds.like) {
      const g = Number(ds.g) || G;
      const src = g === G ? gd : all[g];
      const liked = !!src?.likes?.[ds.like]?.[me];
      patch(`group/${g}`, { likes: { [ds.like]: { [me]: liked ? DEL : true } } }).catch(() => toast('연결을 확인해 주세요'));
      return;
    }
    if (ds.edit) { const n = gd.notes?.[ds.edit]; if (n?.a === me) openWrite({ id: ds.edit, ...n }); return; }
    if (ds.del) {
      const n = gd.notes?.[ds.del];
      if (!n || n.a !== me || !confirm('내 의견을 삭제할까요?')) return;
      const id = ds.del, likes = gd.likes?.[id];
      patch(`group/${G}`, { notes: { [id]: DEL }, likes: { [id]: DEL } }).catch(() => toast('연결을 확인해 주세요'));
      toast('삭제했습니다', { action: '되돌리기', onAction: () => patch(`group/${G}`, { notes: { [id]: n }, ...(likes ? { likes: { [id]: likes } } : {}) }) });
    }
  });
  d.on(root, 'close', e => { if (e.target.id === 'dw' && editId) { editId = null; $('#wtext', root).value = ''; } }, true);
  d.on(root, 'input', e => { if (e.target.id === 'wtext') $('#wcount', root).textContent = `${e.target.value.length}/200`; });
  render();
}
