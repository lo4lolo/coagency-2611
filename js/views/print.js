// 인쇄용 QR 포스터(A4 세로 1장). 주소: #/print
import { TITLE, COURSE, CENTER_Q, TOPICS } from '../content.js';
import { esc, qrSvg, link } from '../common.js';

export default function print(root) {
  root.innerHTML = `<div class="print">
    <div class="print-bar no-print"><b>QR 포스터</b> A4 세로 한 장으로 인쇄됩니다. <button class="btn primary" onclick="print()">인쇄</button></div>
    <article class="poster">
      <p class="eyebrow">${esc(COURSE)} · 분임 토의</p>
      <h1>${esc(TITLE)}</h1>
      <p class="center-q">${esc(CENTER_Q)}</p>
      <div class="poster-qr">${qrSvg(link('/join'))}<p>휴대전화 카메라로 찍고<br><b>희망하는 주제</b>를 고르세요<br><small>자리는 선착순입니다</small></p></div>
      <ol class="poster-topics">${TOPICS.map(t => `<li class="${t.cls}"><span class="tp-n">${t.id}</span><div><b>${esc(t.title)}</b><p>${esc(t.q)}</p></div></li>`).join('')}</ol>
      <p class="small muted center">${esc(link('/join'))}</p>
    </article>
  </div>`;
}
