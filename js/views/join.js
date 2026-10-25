// 참여자: 주제 고르기(선착순). 주소: #/join
import { watch } from '../store.js';
import { TITLE, CENTER_Q, TOPICS } from '../content.js';
import { cfgOf, membersOf, GROUPS } from '../model.js';
import { $, esc, cid, toast, lsSet } from '../common.js';
import { takeSeat } from '../control.js';

export default function join(root, arg, d) {
  const me = cid();
  let ev = {}, groups = {}, busy = 0;

  root.innerHTML = `<main class="join">
    <header class="j-top"><a class="p-home" href="#/" aria-label="처음 화면">⌂</a><div><b>${esc(TITLE)}</b><small>주제 고르기</small></div></header>
    <div id="jnote" class="notice" hidden></div>
    <p class="center-q sm">${esc(CENTER_Q)}</p>
    <div id="jmine"></div>
    <p class="small muted" id="jhow"></p>
    <div class="topics" id="jlist"></div>
  </main>`;

  const seatOf = () => GROUPS.find(g => groups[g]?.members?.[me]) || 0;

  function render() {
    const cfg = cfgOf(ev), mine = seatOf();
    const note = cfg.notice.trim();
    $('#jnote', root).hidden = !note; $('#jnote', root).textContent = note;
    if (cfg.likeOnly) {
      $('#jmine', root).innerHTML = `<a class="mine-seat t1" href="#/all"><span>지금은 공감만 할 수 있어요</span><b>모든 분임의 카드 보고 ♥ 공감하기</b><em>열기 →</em></a>`;
      $('#jhow', root).textContent = '토의는 끝났습니다. 다섯 분임이 모은 생각을 둘러보세요.';
      $('#jlist', root).innerHTML = '';
      return;
    }
    const t = TOPICS.find(x => x.id === mine);
    $('#jmine', root).innerHTML = mine
      ? `<a class="mine-seat ${t.cls}" href="#/g/${mine}"><span>내 분임</span><b>${mine}분임 · ${esc(t.title)}</b><em>대화판으로 →</em></a>`
      : '';
    $('#jhow', root).textContent = mine
      ? (cfg.open ? '다른 주제로 옮기려면 그 주제의 [이 주제로] 버튼을 누르세요. 빈자리가 있어야 옮길 수 있습니다.' : '주제 이동이 마감되었습니다. 지금 분임에서 함께해 주세요.')
      : `희망하는 주제를 고르세요. 분임마다 ${cfg.cap}명까지, 먼저 누른 순서로 자리가 정해집니다.`;
    $('#jlist', root).innerHTML = TOPICS.map(tp => {
      const n = membersOf(groups[tp.id]).length, full = n >= cfg.cap, here = mine === tp.id;
      const locked = mine && !here && !cfg.open;
      const label = here ? '내 분임' : full ? '자리 없음' : locked ? '이동 마감' : busy === tp.id ? '잡는 중…' : '이 주제로';
      return `<article class="topic ${tp.cls} ${here ? 'here' : ''} ${full && !here ? 'full' : ''}">
        <div class="tp-h"><span class="tp-n">${tp.id}</span><div><small>${esc(tp.tag)}</small><h3>${esc(tp.title)}</h3></div></div>
        <p class="tp-q">${esc(tp.q)}</p>
        <div class="seat"><div class="seat-bar"><i style="width:${Math.min(100, n / cfg.cap * 100)}%"></i></div><span><b>${n}</b> / ${cfg.cap}명</span></div>
        <button class="btn ${here ? '' : 'primary'} wide" data-pick="${tp.id}" ${here || full || locked || busy ? 'disabled' : ''}>${label}</button>
      </article>`;
    }).join('');
  }

  d(watch('event', v => { ev = v; render(); }));
  GROUPS.forEach(g => d(watch(`group/${g}`, v => { groups[g] = v; render(); })));

  d.on(root, 'click', async e => {
    const b = e.target.closest('[data-pick]');
    if (!b || busy) return;
    const g = Number(b.dataset.pick);
    busy = g; render();
    try {
      await takeSeat(me, g, seatOf());
      lsSet('ca_seat', String(g));
      location.hash = `#/g/${g}`;
    } catch (err) {
      toast(err.message === 'full' ? '방금 자리가 찼습니다. 다른 주제를 골라 주세요' : err.message === 'closed' ? '주제 이동이 마감되었습니다' : '연결을 확인하고 다시 눌러 주세요');
    } finally { busy = 0; if (location.hash.startsWith('#/join')) render(); }
  });
}
