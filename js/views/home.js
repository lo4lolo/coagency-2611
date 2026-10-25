// 처음 화면: 역할 고르기
import { TITLE, SUBTITLE, COURSE, CENTER_Q, TOPICS } from '../content.js';
import { esc } from '../common.js';

export default function home(root) {
  root.innerHTML = `<main class="home">
    <header class="hero">
      <p class="eyebrow">${esc(COURSE)}</p>
      <h1>${esc(TITLE)}</h1>
      <p class="muted">${esc(SUBTITLE)}</p>
      <div class="center-q">${esc(CENTER_Q)}</div>
    </header>
    <section class="role">
      <a class="role-main" href="#/join"><b>참여자</b><span>주제를 골라 분임에 들어가기</span></a>
      <a class="role-sub" href="#/all"><b>모든 분임 보기</b><span>다섯 분임의 한 문장과 카드를 보고 ♥ 공감하기</span></a>
      <div class="card">
        <h2>분임 진행자</h2>
        <p class="small muted">맡은 분임 번호를 누르세요(PIN 필요).</p>
        <div class="g-btns">${TOPICS.map(t => `<a class="g-btn ${t.cls}" href="#/f/${t.id}"><b>${t.id}</b><small>${esc(t.title)}</small></a>`).join('')}</div>
      </div>
      <div class="row">
        <a class="btn" href="#/admin">운영 콘솔</a>
        <a class="btn" href="#/main" target="_blank" rel="noopener">큰 화면 ↗</a>
        <a class="btn ghost" href="#/print" target="_blank" rel="noopener">QR 포스터 ↗</a>
      </div>
    </section>
  </main>`;
}
