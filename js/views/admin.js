// 운영 콘솔. 주소: #/admin (PIN)
import { watch, patch, replace, mode, EID, DEL } from '../store.js';
import { ADMIN_PIN } from '../config.js';
import { STEPS, TOPICS, LANES, laneOf, SENTENCE_STEM } from '../content.js';
import { cfgOf, stateOf, remain, notesOf, membersOf, GROUPS, DEFAULT_CAP } from '../model.js';
import { $, $$, esc, fmtMs, toast, pinGate, link, qrSvg, download, csv } from '../common.js';
import { stepGo, timerToggle, timerAdd } from '../control.js';

export default function admin(root, arg, d) {
  pinGate(root, 'admin', ADMIN_PIN, '운영 콘솔', start);

  function start() {
    let ev = {}, groups = {}, cfgDrawn = false;
    root.innerHTML = `<div class="adm">
      <header class="adm-top"><a class="p-home" href="#/" aria-label="처음 화면">⌂</a><h1>운영 콘솔</h1>
        <span class="pill ${mode === 'firebase' ? 'ok' : 'warn'}">${mode === 'firebase' ? 'Firebase 연결' : '데모 모드(이 브라우저만)'}</span>
        <span class="muted small">데이터: <b>${esc(EID)}</b></span>
        <nav><a href="${link('/main')}" target="_blank" rel="noopener">큰 화면 ↗</a><a href="${link('/print')}" target="_blank" rel="noopener">QR 포스터 ↗</a></nav></header>

      <section class="card"><h2>진행 단계 <span class="adm-timer mono" id="atimer"></span></h2>
        <div class="step-btns" id="asteps"></div>
        <div class="row"><button class="btn" data-a="toggle">⏯ 멈춤/계속</button><button class="btn" data-a="minus">−1분</button><button class="btn" data-a="plus">+1분</button>
          <span class="small muted">단계를 누르면 큰 화면·진행판·참여자 화면이 함께 바뀌고, 시간이 있는 단계는 타이머가 바로 시작됩니다.</span></div>
      </section>

      <section class="card"><h2>분임 현황</h2>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>분임</th><th>주제</th><th>인원</th>${LANES.map(l => `<th title="${esc(l.name)}">${l.icon}</th>`).join('')}<th>★</th><th>한 문장</th><th></th></tr></thead><tbody id="agroups"></tbody></table></div>
        <p class="small muted">합계 <b id="atotal">0</b>명. 자리를 비우면 그 분임의 자리 기록만 지워지고 카드는 남습니다(나간 분이 있을 때).</p>
      </section>

      <section class="card"><h2>설정</h2>
        <form id="acfg" class="cfg">
          <label>분임 정원(명) <input type="number" id="ccap" min="1" max="30"></label>
          <label class="chk"><input type="checkbox" id="copen"> 주제 이동 허용 <span class="small muted">끄면 이미 자리 잡은 사람은 옮길 수 없고, 아직 자리가 없는 사람만 빈자리에 들어갈 수 있습니다.</span></label>
          <label class="chk"><input type="checkbox" id="clike"> 공감만 받기 <span class="small muted">켜면 카드 쓰기·수정이 잠기고, 누구나 '모든 분임 보기'에서 ♥만 누를 수 있습니다(수업 뒤 공감 모으기).</span></label>
          <div class="durs">${STEPS.map((s, i) => s.min || ['think', 'talk', 'sentence', 'share'].includes(s.key) ? `<label>${esc(s.name)}(분) <input type="number" min="0" max="60" data-dur="${i}"></label>` : '').join('')}</div>
          <label>참여자 화면 공지(비우면 숨김) <input id="cnotice" maxlength="120" placeholder="예: 3분임은 창가 쪽 테이블입니다"></label>
          <div class="row"><button class="btn primary">설정 저장</button><span class="small muted" id="cfghint"></span></div>
        </form>
      </section>

      <section class="card"><h2>주소</h2>
        <div class="links">
          <div class="qr-mini">${qrSvg(link('/join'))}<div><b>참여자(주제 고르기)</b><br><a href="${link('/join')}" target="_blank">${esc(link('/join'))}</a><br><b>모든 분임 보기·공감</b><br><a href="${link('/all')}" target="_blank">${esc(link('/all'))}</a></div></div>
          <table class="tbl"><tbody>${TOPICS.map(t => `<tr><td><b>${t.id}분임</b> ${esc(t.title)}</td><td><a href="${link('/f/' + t.id)}" target="_blank">진행판</a></td><td><a href="${link('/g/' + t.id)}" target="_blank">참여자 대화판</a></td></tr>`).join('')}</tbody></table>
        </div>
      </section>

      <section class="card"><h2>결과 내려받기 · 초기화</h2>
        <div class="row"><button class="btn primary" data-a="csvNotes">카드 전체(CSV)</button><button class="btn" data-a="csvSent">분임 한 문장(CSV)</button><button class="btn ghost" data-a="json">전체 백업(JSON)</button></div>
        <p class="small muted">이름은 저장하지 않습니다. CSV는 엑셀에서 바로 열립니다.</p>
        <div class="row"><button class="btn danger" data-a="wipe">데이터 모두 지우기</button><span class="small muted">리허설 뒤 수업 전에만 쓰세요.</span></div>
      </section>
    </div>`;

    function render() {
      const cfg = cfgOf(ev), st = stateOf(ev);
      $('#asteps', root).innerHTML = STEPS.map((s, i) => `<button class="${i === st.step ? 'on' : ''}" data-step="${i}"><b>${i + 1}. ${esc(s.name)}</b><small>${cfg.dur[i] ? cfg.dur[i] + '분' : '시간 없음'}</small></button>`).join('');
      let total = 0;
      $('#agroups', root).innerHTML = TOPICS.map(t => {
        const gd = groups[t.id] || {}, list = notesOf(gd, null, t.id).filter(n => !n.hid), m = membersOf(gd).length;
        total += m;
        return `<tr><td><b>${t.id}</b></td><td>${esc(t.title)}</td><td class="${m >= cfg.cap ? 'warn-t' : ''}">${m} / ${cfg.cap}</td>
          ${LANES.map(l => `<td>${list.filter(n => laneOf(n.l).key === l.key).length}</td>`).join('')}<td>${list.filter(n => n.star).length}</td>
          <td class="sent-td">${esc(gd.sentence || '')}</td>
          <td><button class="link" data-clear="${t.id}">자리 비우기</button> <a href="${link('/f/' + t.id)}" target="_blank">진행판</a></td></tr>`;
      }).join('');
      $('#atotal', root).textContent = total;
      if (!cfgDrawn) {
        cfgDrawn = true;
        $('#ccap', root).value = cfg.cap; $('#copen', root).checked = cfg.open; $('#clike', root).checked = cfg.likeOnly; $('#cnotice', root).value = cfg.notice;
        $$('[data-dur]', root).forEach(x => { x.value = cfg.dur[x.dataset.dur]; });
      }
      $('#cfghint', root).textContent = `지금 ${total}명 → 5개 분임이면 분임당 ${Math.ceil(total / 5) || 0}명. 정원은 이보다 1명쯤 여유 있게.`;
      tick();
    }
    function tick() {
      const st = stateOf(ev), r = remain(st);
      $('#atimer', root).textContent = r == null ? '' : `${st.paused ? '⏸ ' : ''}${fmtMs(r)}`;
    }
    d.every(1000, tick);

    d(watch('event', v => {
      ev = v;
      // 처음 여는 행사면 기본 설정을 만들어 둠(보안 규칙이 정원 값을 읽음)
      if (!v.config) patch('event', { config: { cap: DEFAULT_CAP, open: true }, state: { step: 0 } }).catch(() => {});
      render();
    }));
    GROUPS.forEach(g => d(watch(`group/${g}`, v => { groups[g] = v; render(); })));

    const safe = p => p?.catch?.(() => toast('연결을 확인해 주세요'));
    const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

    d.on(root, 'submit', e => {
      if (e.target.id !== 'acfg') return;
      e.preventDefault();
      const dur = {};
      $$('[data-dur]', root).forEach(x => { dur[x.dataset.dur] = Math.max(0, Number(x.value) || 0); });
      safe(patch('event', { config: { cap: Math.max(1, Number($('#ccap', root).value) || DEFAULT_CAP), open: $('#copen', root).checked, likeOnly: $('#clike', root).checked, notice: $('#cnotice', root).value.trim(), dur } })?.then(() => toast('설정을 저장했습니다')));
    });
    d.on(root, 'click', async e => {
      const b = e.target.closest('button');
      if (!b) return;
      const ds = b.dataset, a = ds.a;
      if (ds.step != null) return safe(stepGo(ev, Number(ds.step)));
      if (a === 'toggle') return safe(timerToggle(ev));
      if (a === 'plus' || a === 'minus') return safe(timerAdd(ev, a === 'plus' ? 1 : -1));
      if (ds.clear) {
        const g = Number(ds.clear), n = membersOf(groups[g]).length;
        if (n && confirm(`${g}분임의 자리 기록 ${n}개를 비울까요? (카드는 남습니다)`)) safe(patch(`group/${g}`, { members: DEL }));
        return;
      }
      const all = () => GROUPS.flatMap(g => notesOf(groups[g], null, g)).sort((x, y) => x.g - y.g || (x.ts || 0) - (y.ts || 0));
      if (a === 'csvNotes') return download(`분임토의_카드_${stamp()}.csv`, csv([['분임', '주제', '칸', '내용(원문)', '공감', '핵심', '작성', '삭제', '작성 시각'],
        ...all().map(n => [n.g, TOPICS.find(t => t.id === n.g)?.title, laneOf(n.l).name, n.t, n.likeN, n.star ? '★' : '', n.a === 'facil' ? '진행자' : '참여자', n.hid ? '삭제' : '', n.ts ? new Date(n.ts).toLocaleString('ko-KR') : ''])]));
      if (a === 'csvSent') return download(`분임토의_한문장_${stamp()}.csv`, csv([['분임', '주제', '분임 질문', '한 문장'], ...TOPICS.map(t => [t.id, t.title, t.q, groups[t.id]?.sentence ? `${SENTENCE_STEM} ${groups[t.id].sentence}` : ''])]));
      if (a === 'json') return download(`분임토의_백업_${stamp()}.json`, JSON.stringify({ event: ev, groups }, null, 2), 'application/json');
      if (a === 'wipe') {
        if (prompt(`"${EID}"의 카드·공감·자리·한 문장·진행 단계를 모두 지웁니다. 먼저 전체 백업(JSON)을 받아 두세요.\n계속하려면 초기화 라고 입력하세요.`) !== '초기화') return;
        try {
          for (const g of GROUPS) await replace(`group/${g}`, {});
          await patch('event', { state: { step: 0, endsAt: null, paused: false, remain: null } });
          toast('지웠습니다');
        } catch { toast('지우지 못했습니다'); }
      }
    });
  }
}
