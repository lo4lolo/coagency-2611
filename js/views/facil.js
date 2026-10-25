// 분임 진행자 진행판. 주소: #/f/3 (PIN)
import { watch, patch } from '../store.js';
import { FACIL_PIN } from '../config.js';
import { LANES, laneOf, topicOf, SENTENCE_STEM, FACIL_TIPS } from '../content.js';
import { cfgOf, stateOf, stepOf, remain, notesOf, membersOf, byOld, byLikes, newId } from '../model.js';
import { $, $$, esc, fmtMs, toast, card, freshTracker, pinGate, qrSvg, link, keepAwake, beep, lsGet, lsSet } from '../common.js';

export default function facil(root, arg, d) {
  const G = Number(arg);
  const T = topicOf(G);
  if (!T) { location.hash = '#/'; return; }
  pinGate(root, 'facil', FACIL_PIN, `${G}분임 진행판`, start);

  function start() {
    let ev = {}, gd = {}, adding = null, draft = '', editId = null, dragId = null, pending = false, showHidden = false;
    let sound = lsGet('ca_sound') !== '0', lastR = null, lastStepKey = null;
    const fresh = freshTracker();
    keepAwake(d);
    document.title = `${G}분임 진행판`;

    root.innerHTML = `<div class="fb ${T.cls}">
      <header class="fb-top">
        <a class="p-home" href="#/" aria-label="처음 화면">⌂</a>
        <div class="fb-g"><span class="tp-n">${G}</span><div><small>${esc(T.tag)}</small><b>${esc(T.title)}</b></div></div>
        <div class="fb-step" id="fstep"></div>
        <div class="fb-timer mono" id="ftimer">--:--</div>
        <span class="pill" id="fmem"></span>
        <div class="fb-tools">
          <button class="ib" data-a="qr" title="주제 고르기 QR">QR</button>
          <button class="ib" data-a="sound" id="fsound" title="시간이 끝나면 알림음">${sound ? '🔔' : '🔕'}</button>
          <button class="ib" data-a="full" title="전체 화면">⛶</button></div>
      </header>
      <div class="fb-main">
        <aside class="fb-side">
          <div class="fb-q"><small>분임 질문</small><p>${esc(T.q)}</p>
            <ul>${T.sub.map(s => `<li>${esc(s)}</li>`).join('')}</ul><p class="small muted">연결: ${esc(T.link)}</p></div>
          <div class="fb-tips" id="ftips"></div>
        </aside>
        <section class="fb-board">
          <div class="lanes" id="flanes"></div>
          <div id="fhid"></div>
          <form class="sent-box" id="fsent"><label for="fsentIn"><b>분임 한 문장</b> <span class="small muted">입력하면 큰 화면과 참여자 화면에 바로 나옵니다</span></label>
            <div class="sent-row"><span class="stem">${esc(SENTENCE_STEM)}</span><input id="fsentIn" maxlength="120" placeholder="____ (빈칸을 채워 주세요)"><button class="btn primary">저장</button></div>
            <p class="small muted" id="fsentSaved"></p></form>
        </section>
      </div>
      <div class="qr-ov" id="fqr" hidden><div>${qrSvg(link('/join'))}<h2>휴대전화로 주제를 고르세요</h2><p>카메라로 찍으면 주제 고르기 화면이 열립니다 · 아무 곳이나 누르면 닫힘</p></div></div>
      <dialog id="fedit"><form method="dialog" class="dlg"><h3>진행자 입력 카드 고치기</h3><p class="small muted">참여자가 올린 카드는 원문을 지키기 위해 고칠 수 없습니다.</p>
        <textarea id="feditT" rows="3" maxlength="200"></textarea><div class="row end"><button class="btn ghost" value="cancel">닫기</button><button class="btn primary" type="button" data-a="editSave">고치기</button></div></form></dialog>
    </div>`;

    const setNote = (id, obj) => patch(`group/${G}`, { notes: { [id]: obj } }).catch(() => toast('연결을 확인해 주세요'));

    function render() {
      const cfg = cfgOf(ev), st = stateOf(ev), s = stepOf(st);
      if (s.key !== lastStepKey) { lastStepKey = s.key; lastR = null; }
      $('#fstep', root).innerHTML = `<small>지금 단계</small><b>${st.step + 1}. ${esc(s.name)}</b>`;
      const n = membersOf(gd).length;
      $('#fmem', root).textContent = `참여 ${n} / ${cfg.cap}명`;
      $('#fmem', root).className = `pill ${n >= cfg.cap ? 'warn' : 'ok'}`;
      $('#ftips', root).innerHTML = `<small>${esc(s.name)} · 진행 도움말</small><p class="say">${esc(s.say)}</p><ul>${(FACIL_TIPS[s.key] || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
      const inp = $('#fsentIn', root);
      if (document.activeElement !== inp) inp.value = gd.sentence || '';
      $('#fsentSaved', root).textContent = gd.sentence ? `저장됨: ${SENTENCE_STEM} ${gd.sentence}` : '';
      renderLanes();
      tick();
    }

    function renderLanes(force) {
      const ae = document.activeElement;
      if (!force && ae?.id === 'fadd') { pending = true; return; }
      pending = false;
      const st = stateOf(ev), s = stepOf(st);
      const all = notesOf(gd, null, G);
      const list = all.filter(n => !n.hid);
      const isNew = fresh(list);
      const sort = ['sentence', 'share', 'close'].includes(s.key) ? byLikes : byOld;
      $('#flanes', root).innerHTML = LANES.map(l => {
        const items = list.filter(n => laneOf(n.l).key === l.key).sort(sort);
        return `<div class="lane ${l.cls}" data-drop="${l.key}">
          <div class="lane-h"><b>${l.icon} ${esc(l.name)}</b><span class="cnt">${items.length}</span></div>
          <div class="lane-body">${items.map(n => card(n, { like: false, tools: true, fresh: isNew.has(n.id) && n.a !== 'facil' })).join('') || `<p class="lane-empty">${esc(l.hint)}</p>`}</div>
          ${adding === l.key ? `<form class="lane-add-f" data-addf="${l.key}"><textarea id="fadd" rows="2" maxlength="200" placeholder="들은 의견을 적고 Enter">${esc(draft)}</textarea>
            <div class="row end"><button type="button" class="link" data-a="addCancel">취소</button><button class="btn primary small">붙이기</button></div></form>`
            : `<button class="lane-add" data-add="${l.key}">+ 의견 추가</button>`}
        </div>`;
      }).join('');
      const hidden = all.filter(n => n.hid);
      $('#fhid', root).innerHTML = hidden.length ? `<div class="hid-bar"><button class="link" data-a="showHidden">🗑 삭제한 카드 ${hidden.length}개 ${showHidden ? '접기' : '보기'}</button>
        ${showHidden ? `<div class="hid-list">${hidden.map(n => `<span class="hid-item">${esc(n.t)} <button class="link" data-restore="${n.id}">되살리기</button></span>`).join('')}</div>` : ''}</div>` : '';
      if (adding) { const ta = $('#fadd', root); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }
    }

    function tick() {
      const st = stateOf(ev), r = remain(st);
      const el = $('#ftimer', root);
      el.textContent = r == null ? '--:--' : fmtMs(r);
      el.classList.toggle('late', r != null && r <= 0);
      el.classList.toggle('paused', st.paused);
      if (sound && !st.paused && lastR != null && lastR > 0 && r != null && r <= 0) beep(3);
      lastR = r;
    }
    d.every(500, tick);

    d(watch('event', v => { ev = v; render(); }));
    d(watch(`group/${G}`, v => { gd = v; render(); }));

    function addNote(lane, text) {
      const t = text.trim();
      if (!t) return;
      patch(`group/${G}`, { notes: { [newId()]: { l: lane, t, a: 'facil', ts: Date.now() } } }).catch(() => toast('연결을 확인해 주세요'));
    }

    d.on(root, 'click', e => {
      if (e.target.closest('#fqr')) { $('#fqr', root).hidden = true; return; }
      const b = e.target.closest('button');
      if (!b) return;
      const ds = b.dataset, a = ds.a;
      if (a === 'qr') { $('#fqr', root).hidden = false; return; }
      if (a === 'full') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); return; }
      if (a === 'sound') { sound = !sound; lsSet('ca_sound', sound ? '1' : '0'); $('#fsound', root).textContent = sound ? '🔔' : '🔕'; if (sound) beep(1); return; }
      if (a === 'addCancel') { adding = null; draft = ''; renderLanes(true); return; }
      if (a === 'showHidden') { showHidden = !showHidden; renderLanes(true); return; }
      if (a === 'editSave') {
        const v = $('#feditT', root).value.trim();
        if (editId && v) setNote(editId, { t: v, ed: true });
        editId = null; $('#fedit', root).close(); return;
      }
      if (ds.add) { adding = ds.add; draft = ''; renderLanes(true); return; }
      if (ds.star) { const n = gd.notes?.[ds.star]; setNote(ds.star, { star: !n?.star }); return; }
      if (ds.hide) { const id = ds.hide; setNote(id, { hid: true }); toast('카드를 삭제했습니다', { action: '되돌리기', onAction: () => setNote(id, { hid: false }) }); return; }
      if (ds.restore) { setNote(ds.restore, { hid: false }); return; }
      if (ds.fedit) { const n = gd.notes?.[ds.fedit]; if (n?.a !== 'facil') return; editId = ds.fedit; $('#feditT', root).value = n.t; $('#fedit', root).showModal(); }
    });
    d.on(root, 'change', e => { if (e.target.dataset.move) setNote(e.target.dataset.move, { l: e.target.value }); });
    d.on(root, 'input', e => { if (e.target.id === 'fadd') draft = e.target.value; });
    d.on(root, 'keydown', e => {
      if (e.target.id === 'fadd' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); }
      if (e.target.id === 'fadd' && e.key === 'Escape') { adding = null; draft = ''; renderLanes(true); }
    });
    d.on(root, 'focusout', () => { setTimeout(() => { if (pending && document.activeElement?.id !== 'fadd') renderLanes(); }, 0); });
    d.on(root, 'submit', e => {
      e.preventDefault();
      if (e.target.id === 'fsent') {
        const v = $('#fsentIn', root).value.trim().replace(/^AI가 협력자가 되려면\s*/, '');
        patch(`group/${G}`, { sentence: v }).then(() => toast(v ? '한 문장을 저장했습니다' : '한 문장을 비웠습니다')).catch(() => toast('연결을 확인해 주세요'));
        $('#fsentIn', root).blur();
        return;
      }
      const f = e.target.closest('[data-addf]');
      if (f) { addNote(f.dataset.addf, $('#fadd', root).value); draft = ''; renderLanes(true); }
    });

    // 끌어서 칸 옮기기
    d.on(root, 'dragstart', e => { const c = e.target.closest('[data-id]'); if (!c) return; dragId = c.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); c.classList.add('dragging'); });
    d.on(root, 'dragend', () => { dragId = null; $$('.dragging, .drop-on', root).forEach(x => x.classList.remove('dragging', 'drop-on')); });
    d.on(root, 'dragover', e => { const z = e.target.closest('[data-drop]'); if (!z || !dragId) return; e.preventDefault(); $$('.drop-on', root).forEach(x => x !== z && x.classList.remove('drop-on')); z.classList.add('drop-on'); });
    d.on(root, 'drop', e => { const z = e.target.closest('[data-drop]'); if (!z || !dragId) return; e.preventDefault(); setNote(dragId, { l: z.dataset.drop }); });
  }
}
